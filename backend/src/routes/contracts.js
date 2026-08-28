const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { generateContractPdfBuffer } = require('../services/contractPdf');

const router = express.Router();
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');
const DEFAULT_CONTRACT_LANGUAGES = ['pt', 'ja'];
const VALID_CONTRACT_LANGUAGES = ['pt', 'ja', 'fil', 'vi', 'id', 'en'];

function ensureContractsDir() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  }
}

function normalizeRelativeContractPath(absolutePath) {
  return path.relative(path.join(__dirname, '../../'), absolutePath).replace(/\\/g, '/');
}

function resolveSafeAbsolutePath(relativePath) {
  const absolute = path.resolve(path.join(__dirname, '../../'), relativePath);
  const base = path.resolve(path.join(__dirname, '../../uploads/contracts'));
  if (!absolute.startsWith(base)) return null;
  return absolute;
}

function normalizeContractLanguages(payload) {
  const rawLanguages = Array.isArray(payload?.idiomas)
    ? payload.idiomas
    : payload?.idioma
      ? [payload.idioma]
      : DEFAULT_CONTRACT_LANGUAGES;

  const normalized = rawLanguages
    .map((idioma) => String(idioma || '').trim().toLowerCase())
    .filter((idioma, index, array) => idioma && array.indexOf(idioma) === index);

  if (normalized.length === 0) {
    return { idiomas: DEFAULT_CONTRACT_LANGUAGES, invalid: [] };
  }

  const invalid = normalized.filter((idioma) => !VALID_CONTRACT_LANGUAGES.includes(idioma));
  return {
    idiomas: normalized.filter((idioma) => VALID_CONTRACT_LANGUAGES.includes(idioma)),
    invalid,
  };
}

function sanitizeFileNamePart(value) {
  return String(value || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Cliente';
}

async function getOptionalClientDocument(clientId) {
  if (!clientId) return null;

  try {
    const rows = await query(
      `SELECT id, filename, file_type AS fileType, file_path AS filePath, data_upload AS dataUpload
       FROM documentos
       WHERE entity_type = 'cliente' AND entity_id = ?
       ORDER BY data_upload DESC
       LIMIT 1`,
      [clientId]
    );
    return rows[0] || null;
  } catch (error) {
    console.warn('[contracts] Falha ao buscar documento opcional do cliente. Fluxo seguirá sem documento.', {
      clientId,
      error: error?.message,
    });
    return null;
  }
}

// Contratos - vendas sem contrato gerado
router.get('/vendas_carros/pending-delivery', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT
        v.id,
        v.clienteId,
        COALESCE(c.nome, v.cliente_nome, 'Cliente') AS clienteNome,
        v.fabricante,
        v.modelo,
        v.ano,
        (SELECT ve.placa
         FROM veiculos ve
         WHERE ve.marca = v.fabricante
           AND ve.modelo = v.modelo
         ORDER BY ve.id DESC
         LIMIT 1) AS placa,
        v.valor_total AS valorTotal,
        v.created_at,
        v.contratoPath,
        v.contratoGeradoEm
       FROM vendas_carros v
       LEFT JOIN clientes c ON c.id = v.clienteId
       WHERE v.contratoPath IS NULL OR v.contratoPath = ''
         ORDER BY v.id DESC`
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao listar vendas pendentes de entrega:', error);
    return res.status(500).json({ message: 'Erro ao listar pendências de entrega', error: error.message });
  }
});

// Contratos - vendas com contrato gerado
router.get('/vendas_carros/contracts/generated', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT
        v.id,
        v.clienteId,
        COALESCE(c.nome, v.cliente_nome, 'Cliente') AS clienteNome,
        v.fabricante,
        v.modelo,
        v.ano,
        (SELECT ve.placa
         FROM veiculos ve
         WHERE ve.marca = v.fabricante
           AND ve.modelo = v.modelo
         ORDER BY ve.id DESC
         LIMIT 1) AS placa,
        v.valor_total AS valorTotal,
        v.contratoPath,
        v.contratoGeradoEm
       FROM vendas_carros v
       LEFT JOIN clientes c ON c.id = v.clienteId
       WHERE v.contratoPath IS NOT NULL AND v.contratoPath <> ''
         ORDER BY v.id DESC`
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao listar contratos gerados de vendas_carros:', error);
    return res.status(500).json({ message: 'Erro ao listar contratos gerados', error: error.message });
  }
});

// Geração de contrato server-side por venda de carro (template no backend)
router.post('/vendas_carros/:vendaId/contracts/generate', async (req, res) => {
  try {
    const { vendaId } = req.params;
    const { idiomas, invalid } = normalizeContractLanguages(req.body);

    if (invalid.length > 0) {
      return res.status(400).json({
        message: `Idioma inválido. Use apenas: ${VALID_CONTRACT_LANGUAGES.join(', ')}.`,
        invalid,
      });
    }

    const vendaRows = await query('SELECT * FROM vendas_carros WHERE id = ? LIMIT 1', [vendaId]);
    if (vendaRows.length === 0) {
      return res.status(404).json({ message: 'Venda não encontrada' });
    }
    const venda = vendaRows[0];

    // Campos do carnê de parcelas (body ou fallback para a venda existente)
    const quantidadeParcelas = parseInt(req.body.quantidadeParcelas ?? venda.parcelas ?? 1, 10);
    const dataPrimeiraParcela = req.body.dataPrimeiraParcela || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })();

    const clienteRows = venda.clienteId
      ? await query('SELECT * FROM clientes WHERE id = ? LIMIT 1', [venda.clienteId])
      : [];
    const cliente = clienteRows[0] || null;
    const documento = await getOptionalClientDocument(venda.clienteId);

    const veiculoRows = await query(
      `SELECT *
       FROM veiculos
       WHERE marca = ?
         AND modelo = ?
       ORDER BY id DESC
       LIMIT 1`,
      [venda.fabricante || '', venda.modelo || '']
    );
    const veiculo = veiculoRows[0] || null;

    const configRows = await query('SELECT * FROM configuracoes ORDER BY id DESC LIMIT 1');
    const configuracao = configRows[0] || null;

    const valorTotal = Number(venda.valor_total || venda.valor || 0);
    const valorSinal = Number(venda.valor_pago || 0);
    const valorFinanciado = Math.max(0, valorTotal - valorSinal);

    // ─── Regime de Caixa: Inserir no financeiro APENAS o sinal/entrada da venda ───
    if (valorSinal > 0) {
      try {
        const hoje = new Date().toISOString().split('T')[0];
        const financId = uuidv4();
        const descSinal = `Entrada/Sinal da venda: ${venda.fabricante || ''} ${venda.modelo || ''}`.trim() +
          (cliente?.nome ? ` — Cliente: ${cliente.nome}` : '');
        await query(
          `INSERT INTO financeiro
             (id, data, categoria, tipo, valor, descricao, created_at, updated_at)
           VALUES (?, ?, 'Sinal / Entrada Venda', 'Entrada', ?, ?, NOW(), NOW())`,
          [financId, hoje, valorSinal, descSinal]
        );
      } catch (finSinalErr) {
        console.warn('[contracts] Aviso ao registrar sinal no financeiro:', finSinalErr?.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // ─── Calcular e persistir parcelas (se parcelado) ─────────────────────────
    let parcelasParaCarne = [];
    if (quantidadeParcelas >= 1 && dataPrimeiraParcela) {
      // Limpar parcelas anteriores da mesma venda para não duplicar
      await query('DELETE FROM vendas_parcelas WHERE contrato_id = ?', [vendaId]).catch(() => {});

      const [ano, mes, dia] = dataPrimeiraParcela.split('-').map(Number);
      const valorBaseParcelas = valorFinanciado > 0 ? valorFinanciado : valorTotal;
      const valorParcela = valorBaseParcelas > 0 ? parseFloat((valorBaseParcelas / quantidadeParcelas).toFixed(2)) : 0;

      /**
       * Calcula a data de vencimento da parcela N (base 0).
       * Resolve o "Bug do Dia 31": se o dia original não existir no mês alvo,
       * trava no último dia válido daquele mês (ex: 31/jan + 1mês → 28/fev, não 03/mar).
       */
      function calcVencimento(baseAno, baseMes, baseDia, offsetMeses) {
        const targetMonth = baseMes - 1 + offsetMeses; // 0-indexed
        const targetYear  = baseAno + Math.floor(targetMonth / 12);
        const targetMon   = ((targetMonth % 12) + 12) % 12; // 0-indexed, sem negativo
        const lastDay     = new Date(targetYear, targetMon + 1, 0).getDate();
        const day         = Math.min(baseDia, lastDay);
        return new Date(targetYear, targetMon, day);
      }

      for (let i = 0; i < quantidadeParcelas; i++) {
        const dtVenc   = calcVencimento(ano, mes, dia, i);
        const dtStr    = dtVenc.toISOString().split('T')[0];
        const parcelaId = uuidv4();

        await query(
          `INSERT INTO vendas_parcelas
           (id, contrato_id, client_id, numero_parcela, valor, data_vencimento, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pendente', NOW(), NOW())`,
          [
            parcelaId,
            vendaId,
            venda.clienteId || null,
            i + 1,
            valorParcela,
            dtStr,
          ]
        );

        parcelasParaCarne.push({
          numero: i + 1,
          data_vencimento: dtVenc,
          valor: valorParcela,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    ensureContractsDir();
    const clientName = sanitizeFileNamePart(cliente?.nome || venda?.cliente_nome || 'Cliente');
    const fileDate = new Date().toISOString().slice(0, 10);
    const fileName = `${clientName}_${fileDate}.pdf`;
    const absolutePath = path.join(CONTRACTS_DIR, fileName);
    const relativePath = normalizeRelativeContractPath(absolutePath);

    const pdfBuffer = await generateContractPdfBuffer({
      idiomas,
      venda,
      cliente,
      documento,
      veiculo,
      configuracao,
      parcelasParaCarne, // <- carnê injetado no PDF quando existir
    });

    fs.writeFileSync(absolutePath, pdfBuffer);

    await query(
      'UPDATE vendas_carros SET contratoPath = ?, contratoGeradoEm = NOW() WHERE id = ?',
      [relativePath, venda.id]
    );

    return res.status(201).json({
      success: true,
      vendaId: venda.id,
      idiomas,
      contratoPath: relativePath,
      contratoGeradoEm: new Date().toISOString(),
      viewUrl: `/api/vendas_carros/${venda.id}/contracts/view`,
      downloadUrl: `/api/vendas_carros/${venda.id}/contracts/download`,
      parcelasGeradas: parcelasParaCarne.length,
    });
  } catch (error) {
    console.error('[POST /api/vendas_carros/:vendaId/contracts/generate] Erro detalhado:', {
      vendaId: req.params?.vendaId,
      body: req.body,
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
      sql: error?.sql,
      stack: error?.stack,
    });
    return res.status(500).json({ message: 'Erro ao gerar contrato de venda de carro', error: error.message });
  }
});


// Visualização inline do contrato já gerado
router.get('/vendas_carros/:vendaId/contracts/view', async (req, res) => {
  try {
    const { vendaId } = req.params;
    const rows = await query('SELECT contratoPath FROM vendas_carros WHERE id = ? LIMIT 1', [vendaId]);
    const contratoPath = rows[0]?.contratoPath;

    if (!contratoPath) {
      return res.status(404).json({ message: 'Contrato não encontrado para esta venda' });
    }

    const absolutePath = resolveSafeAbsolutePath(contratoPath);
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Arquivo de contrato não encontrado no servidor' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Erro ao visualizar contrato de venda de carro:', error);
    return res.status(500).json({ message: 'Erro ao visualizar contrato', error: error.message });
  }
});

// Download do contrato já gerado
router.get('/vendas_carros/:vendaId/contracts/download', async (req, res) => {
  try {
    const { vendaId } = req.params;
    const rows = await query('SELECT contratoPath FROM vendas_carros WHERE id = ? LIMIT 1', [vendaId]);
    const contratoPath = rows[0]?.contratoPath;

    if (!contratoPath) {
      return res.status(404).json({ message: 'Contrato não encontrado para esta venda' });
    }

    const absolutePath = resolveSafeAbsolutePath(contratoPath);
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Arquivo de contrato não encontrado no servidor' });
    }

    return res.download(absolutePath, path.basename(absolutePath));
  } catch (error) {
    console.error('Erro ao baixar contrato de venda de carro:', error);
    return res.status(500).json({ message: 'Erro ao baixar contrato', error: error.message });
  }
});

/**
 * POST /api/contracts/generate
 * Gera um contrato de venda em PDF e cria parcelas automaticamente
 * 
 * Body:
 * {
 *   cliente_id: string,
 *   veiculo_id: string,
 *   preco: number,
 *   sinal: number,
 *   parcelas: number,
 *   idioma: 'pt' | 'vi' | 'fil' | 'ja',
 *   pdfBase64: string (PDF em base64 gerado pelo frontend)
 * }
 */
router.post('/contracts/generate', async (req, res) => {
  try {
    const { cliente_id, veiculo_id, preco, sinal, parcelas, idioma, pdfBase64 } = req.body;

    // Validar parâmetros obrigatórios
    if (!cliente_id || !veiculo_id || !preco || !idioma) {
      return res.status(400).json({
        message: 'Parâmetros obrigatórios: cliente_id, veiculo_id, preco, idioma'
      });
    }

    // Validar idioma
    const idiomasValidos = ['pt', 'vi', 'fil', 'ja'];
    if (!idiomasValidos.includes(idioma)) {
      return res.status(400).json({
        message: `Idioma inválido. Idiomas suportados: ${idiomasValidos.join(', ')}`
      });
    }

    // Buscar dados do cliente
    const clienteRows = await query(
      'SELECT * FROM clientes WHERE id = ? LIMIT 1',
      [cliente_id]
    );

    if (clienteRows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const cliente = clienteRows[0];

    // Buscar dados do veículo
    const veiculoRows = await query(
      'SELECT * FROM veiculos WHERE id = ? LIMIT 1',
      [veiculo_id]
    );

    if (veiculoRows.length === 0) {
      return res.status(404).json({ message: 'Veículo não encontrado' });
    }

    const veiculo = veiculoRows[0];

    // Validar/converter dados numéricos
    const precoNum = parseFloat(preco);
    const sinalNum = parseFloat(sinal || 0);
    const parcelasNum = parseInt(parcelas || 1);

    if (isNaN(precoNum) || precoNum <= 0) {
      return res.status(400).json({ message: 'Preço deve ser um número positivo' });
    }

    // Criar ID único para o contrato
    const contractId = uuidv4();
    const timestamp = Date.now();
    const nomeArquivo = `contrato_${cliente_id}_${veiculo_id}_${timestamp}.pdf`;

    // Criar diretório de contratos se não existir
    ensureContractsDir();

    // Salvar PDF se fornecido
    const caminhoCompleto = path.join(CONTRACTS_DIR, nomeArquivo);
    const caminhoRelativo = normalizeRelativeContractPath(caminhoCompleto);

    let fileSize = 0;

    // Se houver PDF em base64, salvar arquivo
    if (pdfBase64) {
      try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        fs.writeFileSync(caminhoCompleto, pdfBuffer);
        fileSize = pdfBuffer.length;
      } catch (err) {
        console.error('Erro ao salvar PDF:', err);
        // Continuar mesmo se falhar ao salvar PDF
      }
    }

    // Registrar contrato no banco de dados
    await query(
      `INSERT INTO client_documents 
       (id, client_id, document_type, path, original_filename, file_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        contractId,
        cliente_id,
        'contrato_venda',
        caminhoRelativo,
        nomeArquivo,
        fileSize
      ]
    );

    // Criar parcelas automaticamente
    const parcelasArray = [];
    const restante = precoNum - sinalNum;
    const valorParcela = parcelasNum > 0 ? (restante / parcelasNum).toFixed(2) : 0;

    // Adicionar sinal como primeira parcela (se houver)
    if (sinalNum > 0) {
      parcelasArray.push({
        numero: 0,
        descricao: 'Sinal',
        valor: sinalNum,
        datavencimento: new Date().toISOString().split('T')[0],
        status: 'pendente'
      });
    }

    // Criar parcelas futuras (30 dias cada)
    for (let i = 1; i <= parcelasNum; i++) {
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + (i * 30));

      parcelasArray.push({
        numero: i,
        descricao: `Parcela ${i}/${parcelasNum}`,
        valor: parseFloat(valorParcela),
        datavencimento: dataVencimento.toISOString().split('T')[0],
        status: 'pendente'
      });
    }

    // Salvar parcelas no banco
    for (const parcela of parcelasArray) {
      const parcelaId = uuidv4();
      await query(
        `INSERT INTO vendas_parcelas 
         (id, contrato_id, client_id, numero_parcela, valor, data_vencimento, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          parcelaId,
          contractId,
          cliente_id,
          parcela.numero,
          parcela.valor,
          parcela.datavencimento,
          parcela.status
        ]
      );
    }

    // Retornar resposta com sucesso
    return res.status(201).json({
      success: true,
      contractId: contractId,
      nomeArquivo: nomeArquivo,
      caminhoDestino: caminhoRelativo,
      parcelas: parcelasArray,
      message: 'Contrato gerado e salvo com sucesso! Parcelas criadas automaticamente.'
    });

  } catch (error) {
    console.error('Erro detalhado em /api/contracts/generate:', {
      body: req.body,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      message: 'Erro ao gerar contrato',
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/blank
 * Gera e retorna inline o PDF bilíngue (JP + idioma secundário) em branco.
 * Query params:
 *   type: 'sale' | 'rental' (default: 'sale')
 *   lang: 'pt' | 'vi' | 'fil' | 'ja' | 'id' | 'en' (default: 'pt')
 *   blank: boolean
 */
router.get('/contracts/blank', async (req, res) => {
  try {
    const type = req.query.type || 'sale';
    const lang = VALID_CONTRACT_LANGUAGES.includes(req.query.lang) ? req.query.lang : 'pt';

    if (type === 'rental') {
      const { generateRentalPdfBuffer } = require('../services/rentalPdf');
      const pdfBuffer = await generateRentalPdfBuffer({
        lang,
        isBlank: true,
        client: null,
        veiculo: null,
        rentalData: null,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contrato-locacao-em-branco.pdf"');
      return res.send(pdfBuffer);
    } else {
      const pdfBuffer = await generateContractPdfBuffer({
        idiomas: [lang],
        isBlank: true,
        venda: null,
        cliente: null,
        documento: null,
        veiculo: null,
        configuracao: null,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contrato-venda-em-branco.pdf"');
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Erro ao gerar contrato em branco:', error);
    return res.status(500).json({ message: 'Erro ao gerar contrato em branco', error: error.message });
  }
});

/**
 * GET /api/contracts/blank-template
 * Gera e retorna inline o PDF bilíngue (JP+PT) em branco para impressão manual.
 * Query param: lang (default: 'pt') — define o idioma secundário.
 */
router.get('/contracts/blank-template', async (req, res) => {
  try {
    const lang = VALID_CONTRACT_LANGUAGES.includes(req.query.lang) ? req.query.lang : 'pt';
    const pdfBuffer = await generateContractPdfBuffer({
      idiomas: [lang],
      isBlank: true,
      venda: null,
      cliente: null,
      documento: null,
      veiculo: null,
      configuracao: null,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="contrato-em-branco.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar contrato em branco:', error);
    return res.status(500).json({ message: 'Erro ao gerar contrato em branco', error: error.message });
  }
});

/**
 * GET /api/contracts/:contractId
 * Recupera informações de um contrato gerado
 */
router.get('/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    const rows = await query(
      'SELECT * FROM client_documents WHERE id = ? AND document_type = ? LIMIT 1',
      [contractId, 'contrato_venda']
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar contrato:', error);
    return res.status(500).json({
      message: 'Erro ao buscar contrato',
      error: error.message
    });
  }
});

/**
 * GET /api/clients/:clientId/contracts
 * Lista todos os contratos de um cliente
 */
router.get('/clients/:clientId/contracts', async (req, res) => {
  try {
    const { clientId } = req.params;

    const rows = await query(
      `SELECT * FROM client_documents 
       WHERE client_id = ? AND document_type = 'contrato_venda'
       ORDER BY created_at DESC`,
      [clientId]
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return res.status(500).json({
      message: 'Erro ao buscar contratos',
      error: error.message
    });
  }
});

/**
 * DELETE /api/contracts/:contractId
 * Remove um contrato
 */
router.delete('/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    // Buscar contrato
    const rows = await query(
      'SELECT path FROM client_documents WHERE id = ? AND document_type = ? LIMIT 1',
      [contractId, 'contrato_venda']
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const { path: filePath } = rows[0];

    // Deletar arquivo se existir
    const caminhoCompleto = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(caminhoCompleto)) {
      fs.unlinkSync(caminhoCompleto);
    }

    // Deletar registro do banco
    await query(
      'DELETE FROM client_documents WHERE id = ? AND document_type = ?',
      [contractId, 'contrato_venda']
    );

    return res.json({ message: 'Contrato removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    return res.status(500).json({
      message: 'Erro ao deletar contrato',
      error: error.message
    });
  }
});

/**
 * GET /api/clients/:clientId/parcelas
 * Lista todas as parcelas de um cliente
 */
router.get('/clients/:clientId/parcelas', async (req, res) => {
  try {
    const { clientId } = req.params;

    const rows = await query(
      `SELECT * FROM vendas_parcelas 
       WHERE client_id = ? 
       ORDER BY numero_parcela ASC`,
      [clientId]
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar parcelas:', error);
    return res.status(500).json({
      message: 'Erro ao buscar parcelas',
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/:contractId/parcelas
 * Lista todas as parcelas de um contrato
 */
router.get('/contracts/:contractId/parcelas', async (req, res) => {
  try {
    const { contractId } = req.params;

    const rows = await query(
      `SELECT * FROM vendas_parcelas 
       WHERE contrato_id = ? 
       ORDER BY numero_parcela ASC`,
      [contractId]
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar parcelas do contrato:', error);
    return res.status(500).json({
      message: 'Erro ao buscar parcelas do contrato',
      error: error.message
    });
  }
});

/**
 * PUT /api/parcelas/:parcelaId
 * Atualiza o status de uma parcela.
 * Quando status = 'pago': também insere automaticamente um lançamento de
 * Entrada na tabela `financeiro` (Regime de Caixa).
 */
router.put('/parcelas/:parcelaId', async (req, res) => {
  try {
    const { parcelaId } = req.params;
    const { status, data_pagamento, observacoes } = req.body;

    // Validar status
    const statusValidos = ['pendente', 'pago', 'atrasado', 'devolvido'];
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({
        message: `Status inválido. Status suportados: ${statusValidos.join(', ')}`
      });
    }

    // Buscar parcela atual
    const rows = await query(
      'SELECT * FROM vendas_parcelas WHERE id = ? LIMIT 1',
      [parcelaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Parcela não encontrada' });
    }

    const parcelaAtual = rows[0];

    // Preparar dados a atualizar
    const campos = [];
    const valores = [];

    if (status) {
      campos.push('status = ?');
      valores.push(status);
    }

    if (data_pagamento) {
      campos.push('data_pagamento = ?');
      valores.push(data_pagamento);
    }

    if (observacoes !== undefined) {
      campos.push('observacoes = ?');
      valores.push(observacoes || null);
    }

    campos.push('updated_at = NOW()');
    valores.push(parcelaId);

    // Atualizar parcela
    await query(
      `UPDATE vendas_parcelas
       SET ${campos.join(', ')}
       WHERE id = ?`,
      valores
    );

    // ─── Regime de Caixa: inserir lançamento financeiro ao dar baixa ────────────
    if (status === 'pago' && parcelaAtual.status !== 'pago') {
      try {
        const dataPagto    = data_pagamento || new Date().toISOString().split('T')[0];
        const descricaoPag = `Parcela ${parcelaAtual.numero_parcela} recebida` +
          (parcelaAtual.client_id ? ` — cliente ID ${parcelaAtual.client_id}` : '');
        const financId = uuidv4();

        await query(
          `INSERT INTO financeiro
             (id, data, categoria, tipo, valor, descricao, created_at, updated_at)
           VALUES (?, ?, 'Parcela Venda', 'Entrada', ?, ?, NOW(), NOW())`,
          [financId, dataPagto, parcelaAtual.valor, descricaoPag]
        );
      } catch (finErr) {
        // Não bloqueia a operação principal se o lançamento falhar
        console.error('[parcelas] Falha ao inserir lançamento financeiro:', finErr?.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // Retornar parcela atualizada
    const updatedRows = await query(
      'SELECT * FROM vendas_parcelas WHERE id = ? LIMIT 1',
      [parcelaId]
    );

    return res.json({
      success: true,
      parcela: updatedRows[0],
      message: 'Parcela atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar parcela:', error);
    return res.status(500).json({
      message: 'Erro ao atualizar parcela',
      error: error.message
    });
  }
});


/**
 * GET /api/contracts/:vendaId/parcelas
 * Retorna todas as parcelas de uma venda específica (pelo contrato_id = vendaId).
 * Usado pelo modal de detalhes em VendasCarros.tsx.
 */
router.get('/:vendaId/parcelas', async (req, res) => {
  try {
    const { vendaId } = req.params;
    const rows = await query(
      `SELECT
         vp.id,
         vp.numero_parcela,
         vp.valor,
         vp.data_vencimento,
         vp.status,
         vp.data_pagamento,
         vp.observacoes
       FROM vendas_parcelas vp
       WHERE vp.contrato_id = ?
       ORDER BY vp.numero_parcela ASC`,
      [vendaId]
    );
    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar parcelas da venda:', error);
    return res.status(500).json({ message: 'Erro ao buscar parcelas', error: error.message });
  }
});

/**
 * GET /api/parcelas/mes/:ano/:mes
 * Retorna todas as parcelas com vencimento no mês/ano informado,
 * enriquecidas com nome e telefone do cliente.
 * Usado pelo painel mensal de Parcelas a Vencer.
 */
router.get('/parcelas/mes/:ano/:mes', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano, 10);
    const mes = parseInt(req.params.mes, 10);

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({ message: 'Ano e mês inválidos.' });
    }

    // Monta intervalo do mês: primeiro e último dia
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim    = new Date(ano, mes, 0).toISOString().split('T')[0]; // último dia do mês

    const rows = await query(
      `SELECT
         vp.id,
         vp.contrato_id,
         vp.client_id,
         vp.numero_parcela,
         vp.valor,
         vp.data_vencimento,
         vp.status,
         vp.data_pagamento,
         vp.observacoes,
         COALESCE(c.nome, vp.observacoes, 'Cliente') AS cliente_nome,
         c.telefone                                   AS cliente_telefone
       FROM vendas_parcelas vp
       LEFT JOIN clientes c ON c.id = vp.client_id
       WHERE vp.data_vencimento BETWEEN ? AND ?
       ORDER BY vp.data_vencimento ASC, c.nome ASC`,
      [inicio, fim]
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar parcelas do mês:', error);
    return res.status(500).json({ message: 'Erro ao buscar parcelas do mês', error: error.message });
  }
});

module.exports = router;
