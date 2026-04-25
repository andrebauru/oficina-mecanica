const express = require('express');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ===== ROTAS DE INTERAÇÕES CRM =====

// GET interações de um cliente
router.get('/clients/:clientId/interactions', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const parsedLimit = Number.parseInt(String(limit), 10);
    const parsedOffset = Number.parseInt(String(offset), 10);

    const rows = await query(
      `SELECT
         id,
         client_id,
         interaction_text,
         observation,
         interaction_type,
         created_at
       FROM client_interactions
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clientId, Number.isNaN(parsedLimit) ? 50 : parsedLimit, Number.isNaN(parsedOffset) ? 0 : parsedOffset]
    );

    const countRows = await query(
      'SELECT COUNT(*) as total FROM client_interactions WHERE client_id = ?',
      [clientId]
    );

    return res.json({
      data: rows || [],
      total: countRows[0]?.total || 0,
      limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
      offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
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
