const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const env = require('./src/config/env');
const { testConnection, query, normalizeDatabaseError } = require('./src/config/database');
const { sessionTimeout, ONE_HOUR_MS } = require('./src/middleware/sessionTimeout');
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

let cachedUserPasswordColumn = null;
async function resolveUserPasswordColumn() {
  if (cachedUserPasswordColumn) return cachedUserPasswordColumn;

  const rows = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND COLUMN_NAME IN ('senha_hash', 'senha', 'senhaHash')
     ORDER BY FIELD(COLUMN_NAME, 'senha_hash', 'senhaHash', 'senha')`
  );

  const passwordColumn = rows[0]?.COLUMN_NAME;
  if (!passwordColumn) {
    const error = new Error("Tabela 'usuarios' sem coluna de senha válida (esperado: senha_hash, senhaHash ou senha).");
    error.statusCode = 500;
    throw error;
  }

  cachedUserPasswordColumn = passwordColumn;
  return cachedUserPasswordColumn;
}

const ENTITY_ROUTES = {
  configuracoes: {
    table: 'configuracoes',
    idColumn: 'id',
    idPrefix: 'cfg',
    fields: {
      id: 'id',
      senhaHash: 'senhaHash',
      nomeEmpresa: 'nomeEmpresa',
      endereco: 'endereco',
      telefone: 'telefone',
      numeroAutorizacao: 'numeroAutorizacao',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    sensitiveFields: ['senhaHash'],
  },
  usuarios: {
    table: 'usuarios',
    idColumn: 'id',
    idPrefix: 'usr',
    fields: {
      id: 'id',
      nome: 'nome',
      email: 'email',
      idioma: 'idioma',
      senhaHash: 'senhaHash',
      cargo: 'cargo',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    sensitiveFields: ['senhaHash'],
  },
  clientes: {
    table: 'clientes',
    idColumn: 'id',
    idPrefix: 'cli',
    fields: {
      id: 'id',
      nome: 'nome',
      email: 'email',
      telefone: 'telefone',
      endereco: 'endereco',
      cnh_number: 'cnh_number',
      observacoes_gerais: 'observacoes_gerais',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  veiculos: {
    table: 'veiculos',
    idColumn: 'id',
    idPrefix: 'vei',
    fields: {
      id: 'id',
      clienteId: 'clienteId',
      marca: 'marca',
      modelo: 'modelo',
      ano: 'ano',
      placa: 'placa',
      chassi: 'chassi',
      kilometragem: 'kilometragem',
      data_venda: 'data_venda',
      nova_placa: 'nova_placa',
      data_transferencia: 'data_transferencia',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  servicos: {
    table: 'servicos',
    idColumn: 'id',
    idPrefix: 'srv',
    fields: {
      id: 'id',
      nome: 'nome',
      descricao: 'descricao',
      valor: 'valor',
      tempoEstimado: 'tempoEstimado',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  pecas: {
    table: 'pecas',
    idColumn: 'id',
    idPrefix: 'pec',
    fields: {
      id: 'id',
      nome: 'nome',
      codigo: 'codigo',
      marca: 'marca',
      modeloCompativel: 'modeloCompativel',
      preco: 'preco',
      quantidade: 'quantidade',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  ordens_servico: {
    table: 'ordens_servico',
    idColumn: 'id',
    idPrefix: 'os',
    fields: {
      id: 'id',
      veiculoId: 'veiculoId',
      clienteId: 'clienteId',
      dataEntrada: 'dataEntrada',
      dataSaida: 'dataSaida',
      status: 'status',
      descricao: 'descricao',
      servicos_ids_json: 'servicos_ids_json',
      pecas_ids_json: 'pecas_ids_json',
      valorTotal: 'valorTotal',
      valorBase: 'valor_base',
      parcelas: 'parcelas',
      juros: 'juros',
      parcelas_status_json: 'parcelas_status_json',
      created_at: 'created_at',
      updated_at: 'updated_at',
      relatorioPath: 'relatorioPath',
      relatorioGeradoEm: 'relatorioGeradoEm',
    },
    jsonFields: ['servicos_ids_json', 'pecas_ids_json', 'parcelas_status_json'],
  },
  vendas_carros: {
    table: 'vendas_carros',
    idColumn: 'id',
    idPrefix: 'vc',
    fields: {
      id: 'id',
      clienteId: 'clienteId',
      clienteNome: 'cliente_nome',
      clienteTelefone: 'cliente_telefone',
      clienteEndereco: 'cliente_endereco',
      valor: 'valor',
      valorPago: 'valor_pago',
      fabricante: 'fabricante',
      modelo: 'modelo',
      ano: 'ano',
      kilometragem: 'kilometragem',
      parcelas: 'parcelas',
      juros: 'juros',
      valorTotal: 'valor_total',
      parcelas_status_json: 'parcelas_status_json',
      reciboPDF: 'recibo_pdf',
      reciboGeradoEm: 'recibo_gerado_em',
      created_at: 'created_at',
      updated_at: 'updated_at',
      contratoPath: 'contratoPath',
      contratoGeradoEm: 'contratoGeradoEm',
    },
    jsonFields: ['parcelas_status_json'],
  },
  financeiro: {
    table: 'financeiro',
    idColumn: 'id',
    idPrefix: 'fin',
    fields: {
      id: 'id',
      data: 'data',
      categoria: 'categoria',
      tipo: 'tipo',
      valor: 'valor',
      descricao: 'descricao',
      categoriaId: 'categoria_id',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  categorias_financeiro: {
    table: 'categorias_financeiro',
    idColumn: 'id',
    idPrefix: 'cat',
    fields: {
      id: 'id',
      nome: 'nome',
      tipo: 'tipo',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  documentos: {
    table: 'documentos',
    idColumn: 'id',
    idPrefix: 'doc',
    fields: {
      id: 'id',
      entityId: 'entity_id',
      entityType: 'entity_type',
      base64: 'base64',
      filename: 'filename',
      anotacao: 'anotacao',
      categoria: 'categoria',
      referenciaId: 'referencia_id',
      referenciaTipo: 'referencia_tipo',
      arquivoOriginal: 'arquivo_original',
      dataUpload: 'data_upload',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  vendas: {
    table: 'vendas',
    idColumn: 'id',
    idPrefix: 'v',
    fields: {
      id: 'id',
      clienteId: 'cliente_id',
      veiculoId: 'veiculo_id',
      clienteNomeSnapshot: 'cliente_nome_snapshot',
      clienteTelefoneSnapshot: 'cliente_telefone_snapshot',
      clienteEnderecoSnapshot: 'cliente_endereco_snapshot',
      dataVenda: 'data_venda',
      valorTotal: 'valor_total',
      valorPago: 'valor_pago',
      tipoVenda: 'tipo_venda',
      numeroParcelas: 'numero_parcelas',
      juros: 'juros',
      statusVenda: 'status_venda',
      foroPagamento: 'foro_pagamento',
      nomeContrato: 'nome_contrato',
      placa: 'placa',
      chassi: 'chassi',
      dataQuitar: 'data_quitar',
      reciboPDF: 'recibo_pdf',
      reciboGeradoEm: 'recibo_gerado_em',
      observacoes: 'observacoes',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  parcelas: {
    table: 'parcelas',
    idColumn: 'id',
    idPrefix: 'par',
    fields: {
      id: 'id',
      vendaId: 'venda_id',
      numeroParcela: 'numero_parcela',
      valor: 'valor',
      dataVencimento: 'data_vencimento',
      status: 'status',
      dataPagamento: 'data_pagamento',
      clienteNome: 'cliente_nome',
      clienteTelefone: 'cliente_telefone',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  agendamentos: {
    table: 'agendamentos',
    idColumn: 'id',
    idPrefix: 'agd',
    fields: {
      id: 'id',
      clienteId: 'clienteId',
      veiculoId: 'veiculoId',
      titulo: 'titulo',
      descricao: 'descricao',
      dataAgendamento: 'data_agendamento',
      status: 'status',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
};

function generateId(prefix = 'id') {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function parseDbRow(entityDef, row) {
  const parsed = {};
  for (const clientKey of Object.keys(entityDef.fields)) {
    if (!(clientKey in row)) continue;
    const value = row[clientKey];
    if ((entityDef.jsonFields || []).includes(clientKey)) {
      if (value == null || value === '') {
        parsed[clientKey] = [];
      } else if (Array.isArray(value)) {
        parsed[clientKey] = value;
      } else {
        try {
          parsed[clientKey] = JSON.parse(value);
        } catch {
          parsed[clientKey] = [];
        }
      }
      continue;
    }
    parsed[clientKey] = value;
  }
  return parsed;
}

function toDbPayload(entityDef, payload, { includeId = true } = {}) {
  const dbPayload = {};
  for (const [clientKey, dbKey] of Object.entries(entityDef.fields)) {
    if (!includeId && clientKey === 'id') continue;
    if (payload[clientKey] === undefined) continue;

    if ((entityDef.jsonFields || []).includes(clientKey)) {
      dbPayload[dbKey] = payload[clientKey] == null ? null : JSON.stringify(payload[clientKey]);
    } else {
      dbPayload[dbKey] = payload[clientKey];
    }
  }
  return dbPayload;
}

function selectColumns(entityDef, { includeSensitive = false } = {}) {
  return Object.entries(entityDef.fields)
    .filter(([clientKey]) => includeSensitive || !(entityDef.sensitiveFields || []).includes(clientKey))
    .map(([clientKey, dbKey]) => `${dbKey} AS ${clientKey}`)
    .join(', ');
}

function filterToWhere(entityDef, queryParams) {
  const filters = [];
  const params = [];
  for (const [key, value] of Object.entries(queryParams || {})) {
    if (value === undefined || value === null || value === '') continue;
    const dbKey = entityDef.fields[key];
    if (!dbKey) continue;
    filters.push(`${dbKey} = ?`);
    params.push(String(value));
  }
  return {
    whereClause: filters.length ? ` WHERE ${filters.join(' AND ')}` : '',
    params,
  };
}

async function getEntityById(resource, id, { includeSensitive = false } = {}) {
  const entityDef = ENTITY_ROUTES[resource];
  const columns = selectColumns(entityDef, { includeSensitive });
  const rows = await query(
    `SELECT ${columns} FROM ${entityDef.table} WHERE ${entityDef.idColumn} = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? parseDbRow(entityDef, rows[0]) : null;
}

function registerEntityRoutes(resource, entityDef) {
  const basePath = `/api/${resource}`;

  app.get(basePath, safeRoute(async (req, res) => {
    const columns = selectColumns(entityDef);
    const { whereClause, params } = filterToWhere(entityDef, req.query);
    const rows = await query(
      `SELECT ${columns} FROM ${entityDef.table}${whereClause} ORDER BY ${entityDef.idColumn} ASC`,
      params
    );
    return res.json(rows.map(row => parseDbRow(entityDef, row)));
  }));

  app.get(`${basePath}/:id`, safeRoute(async (req, res) => {
    const found = await getEntityById(resource, req.params.id);
    if (!found) return res.status(404).json({ message: 'Registro não encontrado' });
    return res.json(found);
  }));

  app.post(basePath, safeRoute(async (req, res) => {
    const dbPayload = toDbPayload(entityDef, req.body || {});
    if (!dbPayload[entityDef.idColumn]) {
      dbPayload[entityDef.idColumn] = generateId(entityDef.idPrefix);
    }

    const columns = Object.keys(dbPayload);
    const values = Object.values(dbPayload);
    const placeholders = columns.map(() => '?').join(', ');

    await query(
      `INSERT INTO ${entityDef.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const created = await getEntityById(resource, dbPayload[entityDef.idColumn]);
    return res.status(201).json(created);
  }));

  app.put(`${basePath}/:id`, safeRoute(async (req, res) => {
    const current = await getEntityById(resource, req.params.id, { includeSensitive: true });
    if (!current) return res.status(404).json({ message: 'Registro não encontrado' });

    const merged = { ...current, ...(req.body || {}), id: req.params.id };
    const dbPayload = toDbPayload(entityDef, merged);
    const updateCols = Object.keys(dbPayload).filter(col => col !== entityDef.idColumn);

    if (updateCols.length === 0) return res.json(current);

    const updateSql = updateCols.map(col => `${col} = ?`).join(', ');
    const params = [...updateCols.map(col => dbPayload[col]), req.params.id];

    await query(`UPDATE ${entityDef.table} SET ${updateSql} WHERE ${entityDef.idColumn} = ?`, params);
    const updated = await getEntityById(resource, req.params.id);
    return res.json(updated);
  }));

  app.patch(`${basePath}/:id`, safeRoute(async (req, res) => {
    const current = await getEntityById(resource, req.params.id, { includeSensitive: true });
    if (!current) return res.status(404).json({ message: 'Registro não encontrado' });

    const dbPayload = toDbPayload(entityDef, req.body || {}, { includeId: false });
    const updateCols = Object.keys(dbPayload);

    if (updateCols.length === 0) return res.json(await getEntityById(resource, req.params.id));

    const updateSql = updateCols.map(col => `${col} = ?`).join(', ');
    const params = [...updateCols.map(col => dbPayload[col]), req.params.id];

    await query(`UPDATE ${entityDef.table} SET ${updateSql} WHERE ${entityDef.idColumn} = ?`, params);
    const updated = await getEntityById(resource, req.params.id);
    return res.json(updated);
  }));

  app.delete(`${basePath}/:id`, safeRoute(async (req, res) => {
    const existing = await getEntityById(resource, req.params.id, { includeSensitive: true });
    if (!existing) return res.status(404).json({ message: 'Registro não encontrado' });

    await query(`DELETE FROM ${entityDef.table} WHERE ${entityDef.idColumn} = ?`, [req.params.id]);
    return res.status(204).send();
  }));
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

// Middleware Zero Trust: toda rota /api exige sessão ativa
function requireAuth(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  if (req.method === 'OPTIONS') return next();
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Não autenticado. Faça login para continuar.' });
  }
  return next();
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
  console.log('Recebido no login:', JSON.stringify(req.body));
  const { nome, email, senha } = req.body || {};
  const loginIdentifier = String(nome || email || '').trim();
  if (!loginIdentifier || !senha) {
    return sendAuthError(res, 400, 'Usuário/Email e senha são obrigatórios.');
  }

  const rows = await query(
    'SELECT id, nome, email, idioma, senhaHash FROM usuarios WHERE nome = ? OR email = ? LIMIT 1',
    [loginIdentifier, loginIdentifier]
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
    await query('UPDATE usuarios SET senhaHash = ? WHERE id = ?', [newHash, user.id]).catch(() => {});
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
    'INSERT INTO usuarios (id, nome, email, idioma, senhaHash) VALUES (?, ?, ?, ?, ?)',
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

  const rows = await query('SELECT id, senhaHash FROM usuarios WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0];
  if (!user || !verifyPassword(senhaAtual, user.senhaHash)) {
    return sendAuthError(res, 401, 'Senha atual incorreta.');
  }

  const newHash = upgradePasswordHash(novaSenha);
  await query('UPDATE usuarios SET senhaHash = ? WHERE id = ?', [newHash, userId]);
  return res.json({ success: true });
}));

Object.entries(ENTITY_ROUTES).forEach(([resource, entityDef]) => {
  registerEntityRoutes(resource, entityDef);
});

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
