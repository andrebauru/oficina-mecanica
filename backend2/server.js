// Carregar variáveis de ambiente ANTES de qualquer outro módulo
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// =============================================================
// DIAGNÓSTICO DE MÓDULOS (remover após confirmar que tudo sobe)
// =============================================================
console.log('[BOOT] Verificando módulos críticos...');
const _modChecks = [
  ['express',          () => require('express')],
  ['bcrypt',           () => require('bcrypt')],
  ['cors',             () => require('cors')],
  ['jsonwebtoken',     () => require('jsonwebtoken')],
  ['express-session',  () => require('express-session')],
  ['mysql2/promise',   () => require('mysql2/promise')],
  ['./config/env',     () => require('./config/env')],
  ['./config/database',() => require('./config/database')],
  ['./config/entities',() => require('./config/entities')],
  ['./middleware/authMiddleware',    () => require('./middleware/authMiddleware')],
  ['./middleware/sessionTimeout',    () => require('./middleware/sessionTimeout')],
  ['./middleware/loggingMiddleware', () => require('./middleware/loggingMiddleware')],
  ['./routes/clientCrm',  () => require('./routes/clientCrm')],
  ['./routes/contracts',  () => require('./routes/contracts')],
];
for (const [name, loader] of _modChecks) {
  try { loader(); console.log(`[BOOT] OK  ${name}`); }
  catch (e) { console.error(`[BOOT] FAIL ${name} =>`, e.message); }
}
console.log('[BOOT] Verificação de módulos concluída.\n');
// =============================================================

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const env = require('./config/env');
const { testConnection, query } = require('./config/database');
const authMiddleware = require('./middleware/authMiddleware');
const { sessionTimeout, ONE_HOUR_MS } = require('./middleware/sessionTimeout');
const { requestLoggingMiddleware, errorLoggingMiddleware, setupLoggingRoutes } = require('./middleware/loggingMiddleware');
const {
  collectionConfig,
  toDatabaseRecord,
  toClientRecord,
  allowedFilterMap,
} = require('./config/entities');
const clientCrmRouter = require('./routes/clientCrm');
const contractsRouter = require('./routes/contracts');

const app = express();
const authRouter = express.Router();
const principalRouter = express.Router();

const corsOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});
app.use(requestLoggingMiddleware);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/storage', express.static(path.join(__dirname, '../storage')));
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

async function findUserByEmail(email) {
  // Tenta buscar com coluna cargo; se não existir, busca sem ela
  let rows;
  try {
    rows = await query(
      'SELECT id, nome, email, senhaHash, cargo FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
  } catch (err) {
    // Coluna `cargo` pode não existir em instâncias antigas — tenta sem ela
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.warn('[WARN] Coluna `cargo` não encontrada em usuarios, buscando sem ela.');
      rows = await query(
        'SELECT id, nome, email, senhaHash FROM usuarios WHERE email = ? LIMIT 1',
        [email]
      );
    } else {
      throw err; // Erro real de banco — propaga
    }
  }
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    nome: rows[0].nome,
    email: rows[0].email,
    senhaHash: rows[0].senhaHash,
    cargo: rows[0].cargo || null,
  };
}

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

const handleAuthLogin = async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ message: 'email e senha são obrigatórios' });
  }

  try {
    const user = await findUserByEmail(String(email));
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    console.log(`[LOGIN] Tentativa para: ${email} | senhaHash presente: ${Boolean(user.senhaHash)}`);

    if (!user.senhaHash) {
      return res.status(401).json({ message: 'Credenciais inválidas — hash ausente no banco' });
    }

    const password = String(senha);
    const isMatch = await bcrypt.compare(password, user.senhaHash);
    if (!isMatch) {
      console.warn(`[LOGIN] Senha inválida para: ${email}`);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        cargo: user.cargo || null,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    req.session.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      idioma: user.idioma || 'pt',
      cargo: user.cargo || null,
    };
    req.session.lastActivity = Date.now();

    console.log(`[LOGIN] Sucesso: ${email}`);
    return res.json({
      authenticated: true,
      token,
      tokenType: 'Bearer',
      user: req.session.user,
      expiresInMs: ONE_HOUR_MS,
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno ao processar login',
      debug_msg: error.message,
      debug_stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
};

// Compatibilidade de rotas (com e sem prefixo /api)
authRouter.post('/login', handleAuthLogin);

const handleAuthRegister = async (req, res) => {
  const { nome, email, senha, idioma, cargo } = req.body || {};

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'nome, email e senha são obrigatórios' });
  }

  const existingRows = await query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [String(email)]);
  if (existingRows.length > 0) {
    return res.status(409).json({ message: 'Email já cadastrado' });
  }

  const senhaHash = await bcrypt.hash(String(senha), 10);
  const userId = `usr-${Date.now()}${Math.floor(Math.random() * 1000)}`;

  try {
    await query(
      `INSERT INTO usuarios (id, nome, email, idioma, cargo, senhaHash, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        String(nome),
        String(email),
        String(idioma || 'pt'),
        cargo ? String(cargo) : null,
        senhaHash,
      ]
    );
  } catch (_error) {
    await query(
      `INSERT INTO usuarios (id, nome, email, idioma, senhaHash, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        String(nome),
        String(email),
        String(idioma || 'pt'),
        senhaHash,
      ]
    );
  }

  const createdRows = await query(
    'SELECT id, nome, email, idioma, cargo FROM usuarios WHERE id = ? LIMIT 1',
    [userId]
  ).catch(async () => {
    const fallbackRows = await query(
      'SELECT id, nome, email, idioma FROM usuarios WHERE id = ? LIMIT 1',
      [userId]
    );
    return fallbackRows.map((row) => ({ ...row, cargo: null }));
  });

  return res.status(201).json({
    user: {
      id: createdRows[0].id,
      nome: createdRows[0].nome,
      email: createdRows[0].email,
      idioma: createdRows[0].idioma,
      cargo: createdRows[0].cargo || null,
    },
  });
};

authRouter.post('/register', handleAuthRegister);

authRouter.post('/logout', (req, res) => {
  if (!req.session) {
    return res.json({ authenticated: false });
  }
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

principalRouter.use('/auth', authRouter);
app.use('/api', principalRouter);
app.use('/auth', authRouter);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Página de emergência pública (sem login)
app.get('/emergency-user-management', async (_req, res) => {
  const users = await query('SELECT id, nome, email, cargo FROM usuarios ORDER BY nome ASC').catch(() => []);
  const rowsHtml = users
    .map(
      (u) => `<tr><td>${escapeHtml(u.id)}</td><td>${escapeHtml(u.nome)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.cargo)}</td></tr>`
    )
    .join('');

  return res.send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Emergência - Usuários</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f4f6f8; padding:20px; }
    .card { background:#fff; border-radius:8px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,.08); }
    h1 { margin-top:0; }
    input, select { padding:8px; margin:4px 0; width:240px; }
    button { background:#0d47a1; color:#fff; border:none; padding:10px 16px; cursor:pointer; border-radius:4px; }
    table { width:100%; border-collapse: collapse; margin-top:18px; }
    th, td { border:1px solid #ddd; padding:8px; text-align:left; }
    .warn { color:#b00020; font-weight:bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Gerenciador de Usuários (Emergência)</h1>
    <form method="POST" action="/emergency-user-management">
      <div><input type="text" name="nome" placeholder="Nome" required /></div>
      <div><input type="email" name="email" placeholder="E-mail" required /></div>
      <div><input type="password" name="senha" placeholder="Nova senha" required /></div>
      <div>
        <select name="cargo">
          <option value="admin">Admin</option>
          <option value="mecanico">Mecânico</option>
        </select>
      </div>
      <button type="submit">Salvar usuário</button>
    </form>

    <h3>Usuários no banco</h3>
    <table>
      <thead><tr><th>ID</th><th>Nome</th><th>Email</th><th>Cargo</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p class="warn">⚠️ Rota temporária de emergência. Remover após uso.</p>
  </div>
</body>
</html>`);
});

app.post('/emergency-user-management', async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const email = String(req.body?.email || '').trim();
  const senha = String(req.body?.senha || '');
  const cargo = String(req.body?.cargo || 'mecanico').trim();

  if (!nome || !email || !senha) {
    return res.status(400).send('nome, email e senha são obrigatórios');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const existing = await query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);

  if (existing.length > 0) {
    await query(
      'UPDATE usuarios SET nome = ?, cargo = ?, senhaHash = ?, updatedAt = NOW() WHERE id = ?',
      [nome, cargo, senhaHash, existing[0].id]
    );
  } else {
    const userId = `usr-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await query(
      'INSERT INTO usuarios (id, nome, email, cargo, senhaHash, idioma, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, nome, email, cargo, senhaHash, 'pt']
    ).catch(async () => {
      await query(
        'INSERT INTO usuarios (id, nome, email, senhaHash, idioma, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, nome, email, senhaHash, 'pt']
      );
    });
  }

  return res.redirect('/emergency-user-management');
});

// Setup logging routes (deve ficar antes do auth para capturar erros de login)
setupLoggingRoutes(app);

app.use('/api', authMiddleware);

// Usar rotas de CRM de clientes
app.use('/api', clientCrmRouter);
// Usar rotas de contratos
app.use('/api', contractsRouter);

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

  const payload = { ...(req.body || {}) };
  if (collection === 'usuarios' && payload.senha) {
    payload.senhaHash = await bcrypt.hash(String(payload.senha), 10);
    delete payload.senha;
  }

  const entity = collectionConfig[collection];
  const dbRecord = toDatabaseRecord(collection, payload);
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

  const payload = { ...(req.body || {}) };
  if (collection === 'usuarios' && payload.senha) {
    payload.senhaHash = await bcrypt.hash(String(payload.senha), 10);
    delete payload.senha;
  }

  const merged = { ...current, ...payload, id };
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

  const payload = { ...(req.body || {}) };
  if (collection === 'usuarios' && payload.senha) {
    payload.senhaHash = await bcrypt.hash(String(payload.senha), 10);
    delete payload.senha;
  }

  const partial = { ...current, ...payload, id };
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

// Servir arquivos estáticos do frontend (depois das rotas da API)
app.use(express.static(path.join(__dirname, '../public')));

// Not found handler (404)
app.use((req, _res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  console.error(`[404] ${req.method} ${req.originalUrl}`);
  next(error);
});

// Error handling middleware (deve ser o último)
app.use(errorLoggingMiddleware);

// Capturar erros não tratados para evitar crash silencioso
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Erro não capturado — servidor continua:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION] Promise rejeitada sem tratamento:');
  console.error(reason instanceof Error ? reason.stack : reason);
});

app.listen(env.apiPort, async () => {
  console.log('\n=== HIRATA CARS BACKEND ===');
  console.log(`[ROUTES] POST   /api/auth/login`);
  console.log(`[ROUTES] POST   /api/auth/register`);
  console.log(`[ROUTES] POST   /api/auth/logout`);
  console.log(`[ROUTES] GET    /api/health`);
  console.log(`[ROUTES] GET    /api/session`);
  console.log(`[ROUTES] GET    /api/logs`);
  console.log(`[ROUTES] POST   /api/logs/error`);
  console.log(`[ROUTES] GET/POST /emergency-user-management`);
  console.log(`[ROUTES] GET|POST|PUT|PATCH|DELETE /api/:collection`);
  console.log('===========================\n');

  try {
    await testConnection();
    console.log(`✅ MySQL conectado | Backend ativo na porta ${env.apiPort}`);
  } catch (error) {
    console.error('❌ FALHA AO CONECTAR NO MySQL:', error.message);
    console.error('   Verifique as variáveis DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no .env');
    process.exit(1);
  }
});
