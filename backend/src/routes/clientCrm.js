const express = require('express');
const path = require('path');
const { query } = require('../config/database');
const { upload, validateFile } = require('../config/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ===== ROTAS DE DOCUMENTOS =====

// GET todos os documentos de um cliente
router.get('/clients/:clientId/documents', async (req, res) => {
  try {
    const { clientId } = req.params;

    const rows = await query(
      'SELECT * FROM client_documents WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );

    return res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return res.status(500).json({ message: 'Erro ao buscar documentos', error: error.message });
  }
});

// POST upload de documento
router.post('/clients/:clientId/documents', upload.single('file'), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { documentType } = req.body;

    // Validar arquivo
    const validation = validateFile(req.file);
    if (!validation.valid) {
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: validation.error });
    }

    if (!documentType) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'document_type é obrigatório' });
    }

    // Validar se cliente existe
    const clientRows = await query('SELECT id FROM clientes WHERE id = ? LIMIT 1', [clientId]);
    if (clientRows.length === 0) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Salvar registro no banco
    const documentId = uuidv4();
    const relativePath = path.relative(
      path.join(__dirname, '../../'),
      req.file.path
    ).replace(/\\/g, '/');

    await query(
      `INSERT INTO client_documents (id, client_id, document_type, path, original_filename, file_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [documentId, clientId, documentType, relativePath, req.file.originalname, req.file.size]
    );

    const rows = await query('SELECT * FROM client_documents WHERE id = ? LIMIT 1', [documentId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Erro ao deletar arquivo:', e);
      }
    }
    return res.status(500).json({ message: 'Erro ao fazer upload', error: error.message });
  }
});

// DELETE documento
router.delete('/clients/:clientId/documents/:documentId', async (req, res) => {
  try {
    const { clientId, documentId } = req.params;

    // Verificar se documento existe e pertence ao cliente
    const rows = await query(
      'SELECT path FROM client_documents WHERE id = ? AND client_id = ? LIMIT 1',
      [documentId, clientId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    const filePath = rows[0].path;

    // Deletar arquivo do disco
    const fs = require('fs');
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Deletar do banco
    await query('DELETE FROM client_documents WHERE id = ?', [documentId]);

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return res.status(500).json({ message: 'Erro ao deletar documento', error: error.message });
  }
});

// ===== ROTAS DE INTERAÇÕES CRM =====

// GET interações de um cliente
router.get('/clients/:clientId/interactions', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const rows = await query(
      'SELECT * FROM client_interactions WHERE client_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [clientId, parseInt(limit), parseInt(offset)]
    );

    // Contar total para paginação
    const countRows = await query(
      'SELECT COUNT(*) as total FROM client_interactions WHERE client_id = ?',
      [clientId]
    );

    return res.json({
      data: rows || [],
      total: countRows[0]?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erro ao buscar interações:', error);
    return res.status(500).json({ message: 'Erro ao buscar interações', error: error.message });
  }
});

// POST nova interação
router.post('/clients/:clientId/interactions', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { interactionText, observation, interactionType } = req.body;

    if (!interactionText) {
      return res.status(400).json({ message: 'interaction_text é obrigatório' });
    }

    // Validar se cliente existe
    const clientRows = await query('SELECT id FROM clientes WHERE id = ? LIMIT 1', [clientId]);
    if (clientRows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const interactionId = uuidv4();

    await query(
      `INSERT INTO client_interactions (id, client_id, interaction_text, observation, interaction_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [interactionId, clientId, interactionText, observation || null, interactionType || 'atendimento']
    );

    const rows = await query('SELECT * FROM client_interactions WHERE id = ? LIMIT 1', [interactionId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar interação:', error);
    return res.status(500).json({ message: 'Erro ao criar interação', error: error.message });
  }
});

// PUT atualizar interação
router.put('/clients/:clientId/interactions/:interactionId', async (req, res) => {
  try {
    const { clientId, interactionId } = req.params;
    const { interactionText, observation, interactionType } = req.body;

    // Validar se interação existe e pertence ao cliente
    const rows = await query(
      'SELECT * FROM client_interactions WHERE id = ? AND client_id = ? LIMIT 1',
      [interactionId, clientId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Interação não encontrada' });
    }

    const updates = [];
    const values = [];

    if (interactionText !== undefined) {
      updates.push('interaction_text = ?');
      values.push(interactionText);
    }
    if (observation !== undefined) {
      updates.push('observation = ?');
      values.push(observation);
    }
    if (interactionType !== undefined) {
      updates.push('interaction_type = ?');
      values.push(interactionType);
    }

    if (updates.length === 0) {
      return res.json(rows[0]);
    }

    updates.push('updated_at = NOW()');
    values.push(interactionId);

    await query(
      `UPDATE client_interactions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await query('SELECT * FROM client_interactions WHERE id = ? LIMIT 1', [interactionId]);
    return res.json(updated[0]);
  } catch (error) {
    console.error('Erro ao atualizar interação:', error);
    return res.status(500).json({ message: 'Erro ao atualizar interação', error: error.message });
  }
});

// DELETE interação
router.delete('/clients/:clientId/interactions/:interactionId', async (req, res) => {
  try {
    const { clientId, interactionId } = req.params;

    // Verificar se interação existe e pertence ao cliente
    const rows = await query(
      'SELECT * FROM client_interactions WHERE id = ? AND client_id = ? LIMIT 1',
      [interactionId, clientId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Interação não encontrada' });
    }

    await query('DELETE FROM client_interactions WHERE id = ?', [interactionId]);
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar interação:', error);
    return res.status(500).json({ message: 'Erro ao deletar interação', error: error.message });
  }
});

module.exports = router;
