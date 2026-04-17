const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Importar função de geração de PDF do frontend (será chamada via Node)
// Para isso, precisamos de uma abordagem alternativa usando html2pdf em Node.js

/**
 * POST /api/contracts/generate
 * Gera um contrato de venda em PDF
 * 
 * Body:
 * {
 *   cliente_id: string,
 *   veiculo_id: string,
 *   preco: number,
 *   sinal: number,
 *   parcelas: number,
 *   idioma: 'pt' | 'vi' | 'fil' | 'ja'
 * }
 */
router.post('/contracts/generate', async (req, res) => {
  try {
    const { cliente_id, veiculo_id, preco, sinal, parcelas, idioma } = req.body;

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

    // Buscar configurações da empresa
    const empresaRows = await query('SELECT * FROM empresas LIMIT 1');
    const empresa = empresaRows?.[0] || {
      nome: 'Oficina Mecânica',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: ''
    };

    // Validar/converter dados numéricos
    const precoNum = parseFloat(preco);
    const sinalNum = parseFloat(sinal || 0);
    const parcelasNum = parseInt(parcelas || 1);

    if (isNaN(precoNum) || precoNum <= 0) {
      return res.status(400).json({ message: 'Preço deve ser um número positivo' });
    }

    // Criar estrutura de dados para o contrato
    const dadosContrato = {
      cliente: {
        nome: cliente.nome || '',
        cpf: cliente.cpf || '',
        rg: cliente.rg || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || ''
      },
      veiculo: {
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        ano: veiculo.ano || '',
        placa: veiculo.placa || '',
        cor: veiculo.cor || '',
        km: veiculo.km || 0
      },
      empresa: {
        nome: empresa.nome || '',
        cnpj: empresa.cnpj || '',
        endereco: empresa.endereco || '',
        telefone: empresa.telefone || '',
        email: empresa.email || ''
      },
      preco: precoNum,
      sinal: sinalNum,
      parcelas: parcelasNum,
      idioma: idioma,
      dataVenda: new Date().toISOString().split('T')[0]
    };

    // Criar ID único para o contrato
    const contractId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `contrato_${cliente_id}_${veiculo_id}_${timestamp}.pdf`;

    // Criar diretório de contratos se não existir
    const contractsDir = path.join(__dirname, '../../storage/uploads/contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Caminho completo do arquivo
    const caminhoCompleto = path.join(contractsDir, nomeArquivo);
    const caminhoRelativo = path.relative(
      path.join(__dirname, '../../'),
      caminhoCompleto
    ).replace(/\\/g, '/');

    // ========================================
    // IMPORTANTE: Chamada para gerar PDF
    // ========================================
    // Como o gerador de PDF está no frontend, precisamos fazer uma chamada
    // para um endpoint específico ou usar uma biblioteca Node.js
    // Por enquanto, vamos retornar sucesso e a geração será feita no frontend
    // quando o usuário confirmar no dialog

    // Registrar no banco de dados
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
        0 // Tamanho será atualizado após gerar o PDF
      ]
    );

    // Retornar informações para o frontend gerar o PDF
    return res.status(201).json({
      success: true,
      contractId: contractId,
      dados: dadosContrato,
      nomeArquivo: nomeArquivo,
      caminhoDestino: caminhoRelativo,
      message: 'Dados do contrato preparados. PDF será gerado no frontend.'
    });

  } catch (error) {
    console.error('Erro ao preparar contrato:', error);
    return res.status(500).json({
      message: 'Erro ao preparar contrato',
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

module.exports = router;
