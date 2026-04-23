const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const env = require('./src/config/env');
const { testConnection, query, normalizeDatabaseError } = require('./src/config/database');
const { sessionTimeout, ONE_HOUR_MS } = require('./src/middleware/sessionTimeout');
const {
  collectionConfig,
  toDatabaseRecord,
  toClientRecord,
  allowedFilterMap,
} = require('./src/config/entities');
const clientCrmRouter = require('./src/routes/clientCrm');
const contractsRouter = require('./src/routes/contracts');

// ─── Utilitários de senha (espelho de src/utils/security.ts) ──────────────────
function legacyHashPassword(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

function verifyPassword(senha, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith('sha256:')) {
    const parts = storedHash.split(':');
    const salt = parts[1];
    const digest = parts[2];
    if (!salt || !digest) return false;
    const calculated = crypto.createHash('sha256').update(`${salt}:${senha}`).digest('hex');
    return calculated === digest;
  }
  return legacyHashPassword(senha) === storedHash;
}

function upgradePasswordHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.createHash('sha256').update(`${salt}:${senha}`).digest('hex');
  return `sha256:${salt}:${digest}`;
}
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

function safeRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(normalizeDatabaseError(error));
    }
  };
}

function sendAuthError(res, status, message, details) {
  return res.status(status).json({
    ok: false,
    code: status,
    message,
    ...(details ? { details } : {}),
  });
}

app.use(cors({
  origin: (origin, callback) => callback(null, origin || 'http://localhost:5173'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
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

// Middleware de autenticação: bloqueia mutações sem sessão ativa
const AUTH_PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/setup', '/api/auth/status', '/api/session', '/api/health'];
function requireAuth(req, res, next) {
  if (req.method === 'GET') return next();
  if (AUTH_PUBLIC_PATHS.some(p => req.path === p)) return next();
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Não autenticado. Faça login para continuar.' });
  }
  next();
}
app.use(requireAuth);

// Usar rotas de CRM de clientes
app.use('/api', clientCrmRouter);
// Usar rotas de contratos
app.use('/api', contractsRouter);

app.get('/api/health', safeRoute(async (_req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'mysql' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}));

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.user),
    expiresInMs: ONE_HOUR_MS,
    lastActivity: req.session?.lastActivity || null,
  });
});

app.get('/api/auth/status', safeRoute(async (req, res) => {
  const rows = await query('SELECT COUNT(*) AS total FROM usuarios');
  const total = Number(rows[0]?.total || 0);
  res.json({
    authenticated: Boolean(req.session?.user),
    expiresInMs: ONE_HOUR_MS,
    lastActivity: req.session?.lastActivity || null,
    hasUsers: total > 0,
    user: req.session?.user || null,
  });
}));

app.post('/api/auth/login', safeRoute(async (req, res) => {
  const { nome, senha } = req.body || {};
  if (!nome || !senha) {
    return sendAuthError(res, 400, 'Nome e senha são obrigatórios.');
  }

  const rows = await query(
    'SELECT id, nome, email, idioma, senha_hash AS senhaHash FROM usuarios WHERE nome = ? LIMIT 1',
    [nome]
  );
  const user = rows[0];
  if (!user) {
    return sendAuthError(res, 401, 'Usuário não encontrado.');
  }
  if (!verifyPassword(senha, user.senhaHash)) {
    return sendAuthError(res, 401, 'Senha incorreta.');
  }

  // Auto-upgrade de hash legado para sha256
  if (user.senhaHash && !user.senhaHash.startsWith('sha256:')) {
    const newHash = upgradePasswordHash(senha);
    await query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [newHash, user.id]).catch(() => {});
  }

  req.session.user = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    idioma: user.idioma,
  };
  req.session.lastActivity = Date.now();

  return res.json({ authenticated: true, user: req.session.user, expiresInMs: ONE_HOUR_MS });
}));

// Endpoint público de setup inicial: cria o primeiro usuário (bloqueado se já existirem usuários)
app.post('/api/auth/setup', safeRoute(async (req, res) => {
  const { nome, senha } = req.body || {};
  if (!nome || !senha) {
    return sendAuthError(res, 400, 'Nome e senha são obrigatórios.');
  }
  const existingUsers = await query('SELECT id FROM usuarios LIMIT 1');
  if (existingUsers.length > 0) {
    return sendAuthError(res, 403, 'Já existe um usuário cadastrado. Use o login normal.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.createHash('sha256').update(`${salt}:${senha}`).digest('hex');
  const senhaHash = `sha256:${salt}:${digest}`;
  const newId = `usr${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await query(
    'INSERT INTO usuarios (id, nome, email, idioma, senha_hash) VALUES (?, ?, ?, ?, ?)',
    [newId, nome.trim(), '', 'pt', senhaHash]
  );
  req.session.user = { id: newId, nome: nome.trim(), email: '', idioma: 'pt' };
  req.session.lastActivity = Date.now();
  return res.status(201).json({ authenticated: true, user: req.session.user, expiresInMs: ONE_HOUR_MS });
}));

app.post('/api/auth/logout', (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false });
  }
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

app.post('/api/auth/change-password', safeRoute(async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) {
    return sendAuthError(res, 401, 'Sessão inválida.');
  }

  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) {
    return sendAuthError(res, 400, 'Senha atual e nova senha são obrigatórias.');
  }

  const rows = await query('SELECT id, senha_hash AS senhaHash FROM usuarios WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0];
  if (!user || !verifyPassword(senhaAtual, user.senhaHash)) {
    return sendAuthError(res, 401, 'Senha atual incorreta.');
  }

  const newHash = upgradePasswordHash(novaSenha);
  await query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [newHash, userId]);
  return res.json({ success: true });
}));

const editableCollections = Object.keys(collectionConfig);

async function findById(collectionName, id) {
  const entity = collectionConfig[collectionName];
  const rows = await query(`SELECT * FROM ${entity.table} WHERE ${entity.idField} = ? LIMIT 1`, [id]);
  return rows[0] ? toClientRecord(collectionName, rows[0]) : null;
}

app.get('/api/:collection', safeRoute(async (req, res) => {
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
}));

app.get('/api/:collection/:id', safeRoute(async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const found = await findById(collection, id);
  if (!found) return res.status(404).json({ message: 'Registro não encontrado' });
  return res.json(found);
}));

app.post('/api/:collection', safeRoute(async (req, res) => {
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
}));

app.put('/api/:collection/:id', safeRoute(async (req, res) => {
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
}));

app.patch('/api/:collection/:id', safeRoute(async (req, res) => {
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
}));

app.delete('/api/:collection/:id', safeRoute(async (req, res) => {
  const { collection, id } = req.params;
  if (!editableCollections.includes(collection)) {
    return res.status(404).json({ message: 'Coleção não encontrada' });
  }

  const entity = collectionConfig[collection];
  const existing = await findById(collection, id);
  if (!existing) return res.status(404).json({ message: 'Registro não encontrado' });

  await query(`DELETE FROM ${entity.table} WHERE ${entity.idField} = ?`, [id]);
  return res.status(204).send();
}));

app.use((error, _req, res, _next) => {
  const normalized = normalizeDatabaseError(error);
  const statusCode = normalized.statusCode || 500;

  if (statusCode === 503 || statusCode === 504) {
    return res.status(statusCode).json({
      ok: false,
      code: statusCode,
      message: normalized.message,
    });
  }

  return res.status(statusCode).json({
    ok: false,
    code: statusCode,
    message: normalized.message || 'Erro interno do servidor.',
  });
});

app.listen(env.apiPort, async () => {
  try {
    await testConnection();
    console.log(`Backend MySQL ativo na porta ${env.apiPort}`);
  } catch (error) {
    console.error('Falha ao conectar no MySQL:', error.message);
  }
});
