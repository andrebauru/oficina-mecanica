const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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
    const contractsDir = path.join(__dirname, '../../storage/uploads/contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Salvar PDF se fornecido
    const caminhoCompleto = path.join(contractsDir, nomeArquivo);
    const caminhoRelativo = path.relative(
      path.join(__dirname, '../../'),
      caminhoCompleto
    ).replace(/\\/g, '/');

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
    console.error('Erro ao gerar contrato:', error);
    return res.status(500).json({
      message: 'Erro ao gerar contrato',
      error: error.message
    });
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
 * Atualiza o status de uma parcela (pago, atrasado, pendente, devolvido)
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

    // Buscar parcela
    const rows = await query(
      'SELECT * FROM vendas_parcelas WHERE id = ? LIMIT 1',
      [parcelaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Parcela não encontrada' });
    }

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

module.exports = router;
