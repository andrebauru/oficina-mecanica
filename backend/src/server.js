const express = require('express');
const cors = require('cors');
const session = require('express-session');
const env = require('./config/env');
const { testConnection, query } = require('./config/database');
const { sessionTimeout, ONE_HOUR_MS } = require('./middleware/sessionTimeout');
const {
  collectionConfig,
  toDatabaseRecord,
  toClientRecord,
  allowedFilterMap,
} = require('./config/entities');
const clientCrmRouter = require('./routes/clientCrm');
const contractsRouter = require('./routes/contracts');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(session({
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: ONE_HOUR_MS,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  },
}));
app.use(sessionTimeout);

// Usar rotas de CRM de clientes
app.use('/api', clientCrmRouter);
// Usar rotas de contratos
app.use('/api', contractsRouter);

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'mysql' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.user),
    expiresInMs: ONE_HOUR_MS,
    lastActivity: req.session?.lastActivity || null,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { nome } = req.body || {};
  if (!nome) {
    return res.status(400).json({ message: 'Nome de usuário é obrigatório' });
  }

  const rows = await query(
    'SELECT id, nome, email, idioma, senha_hash AS senhaHash FROM usuarios WHERE nome = ? LIMIT 1',
    [nome]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Usuário não encontrado' });
  }

  req.session.user = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    idioma: user.idioma,
  };
  req.session.lastActivity = Date.now();

  return res.json({ authenticated: true, user: req.session.user, expiresInMs: ONE_HOUR_MS });
});

app.post('/api/auth/logout', (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false });
  }
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

const editableCollections = Object.keys(collectionConfig);

async function findById(collectionName, id) {
  const entity = collectionConfig[collectionName];
  const rows = await query(`SELECT * FROM ${entity.table} WHERE ${entity.idField} = ? LIMIT 1`, [id]);
  return rows[0] ? toClientRecord(collectionName, rows[0]) : null;
}

app.get('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const entity = collectionConfig[collection];
  const filters = [];
  const params = [];
  const fieldMap = allowedFilterMap(collection);

  for (const [key, value] of Object.entries(req.query)) {
    if (value === undefined || value === null || value === '') continue;
    const dbKey = fieldMap[key];
    if (!dbKey) continue;
    filters.push(`${dbKey} = ?`);
    params.push(String(value));
  }

  const whereClause = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  const rows = await query(`SELECT * FROM ${entity.table}${whereClause} ORDER BY ${entity.idField} ASC`, params);
  return res.json(rows.map(row => toClientRecord(collection, row)));
});

app.get('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const found = await findById(collection, id);
  if (!found) return res.status(404).json({ message: 'Registro não encontrado' });
  return res.json(found);
});

app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const entity = collectionConfig[collection];
  const dbRecord = toDatabaseRecord(collection, req.body || {});
  const columns = Object.keys(dbRecord);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(c => dbRecord[c]);

  await query(
    `INSERT INTO ${entity.table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const created = await findById(collection, dbRecord[entity.idField]);
  return res.status(201).json(created);
});

app.put('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const current = await findById(collection, id);
  if (!current) return res.status(404).json({ message: 'Registro não encontrado' });

  const merged = { ...current, ...(req.body || {}), id };
  const entity = collectionConfig[collection];
  const dbRecord = toDatabaseRecord(collection, merged);

  const updateColumns = Object.keys(dbRecord).filter(c => c !== entity.idField);
  const updateSql = updateColumns.map(c => `${c} = ?`).join(', ');
  const params = [...updateColumns.map(c => dbRecord[c]), id];

  await query(`UPDATE ${entity.table} SET ${updateSql} WHERE ${entity.idField} = ?`, params);
  const updated = await findById(collection, id);
  return res.json(updated);
});

app.patch('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const current = await findById(collection, id);
  if (!current) return res.status(404).json({ message: 'Registro não encontrado' });

  const partial = { ...current, ...(req.body || {}), id };
  const entity = collectionConfig[collection];
  const dbRecord = toDatabaseRecord(collection, partial);
  const updateColumns = Object.keys(dbRecord).filter(c => c !== entity.idField);
  const updateSql = updateColumns.map(c => `${c} = ?`).join(', ');
  const params = [...updateColumns.map(c => dbRecord[c]), id];

  await query(`UPDATE ${entity.table} SET ${updateSql} WHERE ${entity.idField} = ?`, params);
  const updated = await findById(collection, id);
  return res.json(updated);
});

app.delete('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const entity = collectionConfig[collection];
  const existing = await findById(collection, id);
  if (!existing) return res.status(404).json({ message: 'Registro não encontrado' });

  await query(`DELETE FROM ${entity.table} WHERE ${entity.idField} = ?`, [id]);
  return res.status(204).send();
});

app.listen(env.apiPort, async () => {
  try {
    await testConnection();
    console.log(`Backend MySQL ativo na porta ${env.apiPort}`);
  } catch (error) {
    console.error('Falha ao conectar no MySQL:', error.message);
  }
});
