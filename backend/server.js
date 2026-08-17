const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('./src/config/env');
const { testConnection, query, normalizeDatabaseError } = require('./src/config/database');
const { sessionTimeout, ONE_HOUR_MS } = require('./src/middleware/sessionTimeout');
const clientCrmRouter = require('./src/routes/clientCrm');
const contractsRouter = require('./src/routes/contracts');
const puppeteer = require('puppeteer');
// Carrega o SendGrid de forma segura — se o pacote ainda não estiver instalado, o site continua funcionando
let sgMail = null;
try { sgMail = require('@sendgrid/mail'); } catch { /* sendgrid opcional */ }

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

let veiculosColumnsResolved = false;
let veiculosResolvePromise = null;

async function resolveOptionalColumn(tableName, candidates) {
  const placeholders = candidates.map(() => '?').join(', ');
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME IN (${placeholders})
     ORDER BY FIELD(COLUMN_NAME, ${placeholders})
     LIMIT 1`,
    [tableName, ...candidates, ...candidates]
  );
  return rows[0]?.COLUMN_NAME || null;
}

async function ensureVeiculosColumnsCompatibility() {
  if (veiculosColumnsResolved) return;
  if (!veiculosResolvePromise) {
    veiculosResolvePromise = (async () => {
      const veiculosFields = ENTITY_ROUTES.veiculos.fields;
      const fallbackMap = {
        clienteId: ['clienteId', 'cliente_id'],
        data_venda: ['data_venda', 'dataVenda'],
        nova_placa: ['nova_placa', 'novaPlaca'],
        data_transferencia: ['data_transferencia', 'dataTransferencia'],
        created_at: ['created_at', 'createdAt'],
        updated_at: ['updated_at', 'updatedAt'],
      };

      for (const [clientField, candidates] of Object.entries(fallbackMap)) {
        const resolved = await resolveOptionalColumn('veiculos', candidates);
        if (resolved) {
          veiculosFields[clientField] = resolved;
        }
      }

      veiculosColumnsResolved = true;
    })();
  }

  await veiculosResolvePromise;
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
      status: 'status',
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
      veiculoId: 'veiculo_id',
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
      filename: 'filename',
      filePath: 'file_path',
      fileType: 'file_type',
      anotacao: 'anotacao',
      categoria: 'categoria',
      referenciaId: 'referencia_id',
      referenciaTipo: 'referencia_tipo',
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

  const ensureResourceCompatibility = async () => {
    if (resource === 'veiculos') {
      await ensureVeiculosColumnsCompatibility();
    }
  };

  app.get(basePath, safeRoute(async (req, res) => {
    await ensureResourceCompatibility();
    const columns = selectColumns(entityDef);
    const { whereClause, params } = filterToWhere(entityDef, req.query);
    const rows = await query(
      `SELECT ${columns} FROM ${entityDef.table}${whereClause} ORDER BY ${entityDef.idColumn} ASC`,
      params
    );
    return res.json(rows.map(row => parseDbRow(entityDef, row)));
  }));

  app.get(`${basePath}/:id`, safeRoute(async (req, res) => {
    await ensureResourceCompatibility();
    const found = await getEntityById(resource, req.params.id);
    if (!found) return res.status(404).json({ message: 'Registro não encontrado' });
    return res.json(found);
  }));

  app.post(basePath, safeRoute(async (req, res) => {
    await ensureResourceCompatibility();
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
    await ensureResourceCompatibility();
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
    await ensureResourceCompatibility();
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
    await ensureResourceCompatibility();
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// Servir arquivos estáticos de uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
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

// Middleware Zero Trust: toda rota /api exige sessão ativa,
// exceto bootstrap de autenticação e saúde do serviço.
const AUTH_PUBLIC_PATHS = [
  '/api/auth/status',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/health',
];

function requireAuth(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  if (req.method === 'OPTIONS') return next();
  if (AUTH_PUBLIC_PATHS.some((publicPath) => req.path === publicPath)) return next();
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
    'SELECT id, nome, email, idioma, cargo, senhaHash FROM usuarios WHERE nome = ? OR email = ? LIMIT 1',
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
    cargo: user.cargo,
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
    'INSERT INTO usuarios (id, nome, email, idioma, cargo, senhaHash) VALUES (?, ?, ?, ?, ?, ?)',
    [newId, nome.trim(), '', 'pt', 'admin', senhaHash]
  );
  req.session.user = { id: newId, nome: nome.trim(), email: '', idioma: 'pt', cargo: 'admin' };
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

// ─── Rotas customizadas de documentos (salvamento físico em arquivo) ─────────
app.post('/api/documentos', safeRoute(async (req, res) => {
  try {
    const {
      entityId,
      entityType,
      base64,
      filename,
      fileType,
      anotacao,
      categoria,
      referenciaId,
      referenciaTipo,
      dataUpload,
    } = req.body || {};

    if (!entityId || !entityType || !base64 || !filename) {
      return res.status(400).json({ message: 'entityId, entityType, base64 e filename são obrigatórios.' });
    }

    // Remover prefixo de Data URL (ex: data:image/jpeg;base64,)
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    const inferredFileType = typeof base64 === 'string'
      ? (base64.match(/^data:([^;]+);base64,/)?.[1] || null)
      : null;
    const fileTypeFinal = fileType || inferredFileType;
    const safeEntityId = String(entityId).replace(/[^a-zA-Z0-9.\-_]/g, '') || '0';
    const safeEntityType = String(entityType).replace(/[^a-zA-Z0-9.\-_]/g, '') || 'entity';
    const safeFilename = (filename || 'doc.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '');
    const entityFolder = `${safeEntityType}_${safeEntityId}`;

    // Garantir que a pasta do cliente exista
    const uploadDir = path.join(__dirname, 'uploads', 'documentos', entityFolder);
    fs.mkdirSync(uploadDir, { recursive: true });

    const fileDest = path.join(uploadDir, safeFilename);
    const filePathRelativo = `/api/uploads/documentos/${entityFolder}/${safeFilename}`;

    // Salvar arquivo físico
    fs.writeFileSync(fileDest, Buffer.from(base64Data, 'base64'));

    // Montar INSERT com colunas camelCase (schema legado em produção)
    const dataUploadFinal = dataUpload
      ? new Date(dataUpload).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      `INSERT INTO documentos (id, entity_id, entity_type, file_path, file_type, base64, filename, anotacao, categoria, referencia_id, referencia_tipo, data_upload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        entityId ?? null,
        entityType ?? null,
        filePathRelativo ?? null,
        fileTypeFinal || null,
        '',
        filename ?? null,
        anotacao ?? null,
        categoria ?? null,
        referenciaId ?? null,
        referenciaTipo ?? null,
        dataUploadFinal ?? null,
      ]
    );

    return res.status(201).json({
      id: result?.insertId || docId,
      entityId,
      entityType,
      filename,
      fileType: fileTypeFinal || null,
      caminho: filePathRelativo,
      filePath: filePathRelativo,
      anotacao: anotacao || null,
      categoria: categoria || null,
    });
  } catch (err) {
    console.error('Erro no Upload:', err);
    return res.status(500).json({ error: err.message });
  }
}));

app.get('/api/documentos/:entityType/:entityId', safeRoute(async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const rows = await query(
      `SELECT
         id,
         entity_id AS entityId,
         entity_type AS entityType,
         filename,
         anotacao,
         categoria,
         data_upload AS dataUpload,
         file_path AS caminho,
         file_path AS filePath,
         file_type AS fileType
       FROM documentos
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY data_upload DESC`,
      [entityType, entityId]
    );

    const debugUrls = rows.map((doc) => doc?.filePath || doc?.caminho || null).filter(Boolean);
    console.info('[GET /api/documentos/:entityType/:entityId] URLs enviadas:', debugUrls);

    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/documentos/:entityType/:entityId] Erro ao listar documentos:', err);
    throw err;
  }
}));
// ─────────────────────────────────────────────────────────────────────────────

// Rota customizada para POST /api/vendas_carros com baixa de estoque
app.post('/api/vendas_carros', safeRoute(async (req, res) => {
  const entityDef = ENTITY_ROUTES.vendas_carros;
  const dbPayload = toDbPayload(entityDef, req.body || {});
  
  if (!dbPayload[entityDef.idColumn]) {
    dbPayload[entityDef.idColumn] = generateId(entityDef.idPrefix);
  }

  const columns = Object.keys(dbPayload);
  const values = Object.values(dbPayload);
  const placeholders = columns.map(() => '?').join(', ');

  // Inserir venda
  await query(
    `INSERT INTO ${entityDef.table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  // Se veiculoId foi informado, fazer a baixa de estoque
  if (req.body.veiculoId) {
    try {
      await query(
        'UPDATE veiculos SET status = ? WHERE id = ?',
        ['vendido', req.body.veiculoId]
      );
    } catch (updateError) {
      console.error('Erro ao atualizar status do veículo:', updateError);
      // Não bloqueia a resposta se falhar o UPDATE
    }
  }

  // Retornar registro criado
  const created = await getEntityById('vendas_carros', dbPayload[entityDef.idColumn]);
  return res.status(201).json(created);
}));

// ─── Baixa de parcela ────────────────────────────────────────────────────────
app.put('/api/financeiro/parcelas/:id/pay', safeRoute(async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query('SELECT * FROM parcelas WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Parcela não encontrada' });
    await query(
      `UPDATE parcelas SET status = 'pago', data_pagamento = CURRENT_DATE() WHERE id = ?`,
      [id]
    );
    const updated = await query('SELECT * FROM parcelas WHERE id = ? LIMIT 1', [id]);
    return res.json(updated[0]);
  } catch (err) {
    console.error('[PUT /api/financeiro/parcelas/:id/pay]', err);
    throw err;
  }
}));

// ─── Recibo PDF de parcela ────────────────────────────────────────────────────
app.get('/api/financeiro/parcelas/:id/recibo', safeRoute(async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query(
      `SELECT p.*, v.numero_parcelas AS totalParcelas, v.placa, v.chassi,
              CONCAT(COALESCE(vc2.fabricante,''), ' ', COALESCE(vc2.modelo,'')) AS veiculoDesc
       FROM parcelas p
       LEFT JOIN vendas v ON p.venda_id = v.id
       LEFT JOIN veiculos vc2 ON v.veiculo_id = vc2.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Parcela não encontrada' });
    const parcela = rows[0];

    const cfgRows = await query('SELECT * FROM configuracoes LIMIT 1').catch(() => []);
    const cfg = cfgRows[0] || {};

    let logoBase64 = '';
    try {
      const logoPath = path.resolve(__dirname, '../src/assets/Hirata Logo.svg');
      logoBase64 = `data:image/svg+xml;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    } catch { /* logo opcional */ }

    const dataPagamento = parcela.data_pagamento
      ? new Date(parcela.data_pagamento).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    const dataVencimento = parcela.data_vencimento
      ? new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')
      : '—';
    const totalParcelas = parcela.totalParcelas || '?';
    const numeroParcela = parcela.numero_parcela || '?';
    const valor = Number(parcela.valor || 0).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    const veiculoDesc = (parcela.veiculoDesc || '').trim() || (parcela.placa ? `Placa: ${parcela.placa}` : 'Serviço');
    const nomeEmpresa = cfg.nomeEmpresa || 'Hirata Cars';
    const telefoneEmpresa = cfg.telefone || '';
    const licenca = cfg.numeroAutorizacao || '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #222;
    padding: 30px 40px;
    position: relative;
  }
  .watermark {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 340px; height: 340px;
    background-image: url('${logoBase64}');
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    opacity: 0.07;
    pointer-events: none;
    z-index: 0;
  }
  .content { position: relative; z-index: 1; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a237e; padding-bottom: 12px; margin-bottom: 18px; }
  .header-logo img { height: 60px; }
  .company-info { text-align: right; }
  .company-name { font-size: 18px; font-weight: bold; color: #1a237e; }
  .company-sub { font-size: 11px; color: #555; margin-top: 3px; }
  h1 { text-align: center; font-size: 20px; color: #1a237e; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase; }
  .info-box { background: #f5f7ff; border: 1px solid #c5cae9; border-radius: 6px; padding: 16px 20px; margin-bottom: 18px; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e0e0e0; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-weight: 600; font-size: 13px; }
  .valor-destaque { font-size: 22px; font-weight: bold; color: #1b5e20; text-align: center; background: #e8f5e9; border: 2px solid #a5d6a7; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
  .footer { margin-top: 40px; }
  .assinatura-row { display: flex; gap: 40px; justify-content: center; margin-top: 30px; }
  .assinatura-box { flex: 1; max-width: 200px; text-align: center; }
  .assinatura-line { border-top: 1px solid #333; margin-bottom: 6px; height: 50px; }
  .assinatura-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .recibo-num { text-align: right; font-size: 10px; color: #888; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="watermark"></div>
<div class="content">
  <p class="recibo-num">Recibo Nº ${id.slice(-8).toUpperCase()}</p>
  <div class="header">
    <div class="header-logo">${logoBase64 ? `<img src="${logoBase64}" alt="${nomeEmpresa}" />` : ''}</div>
    <div class="company-info">
      <div class="company-name">${nomeEmpresa}</div>
      ${telefoneEmpresa ? `<div class="company-sub">Tel: ${telefoneEmpresa}</div>` : ''}
      ${licenca ? `<div class="company-sub">Lic. Nº ${licenca}</div>` : ''}
    </div>
  </div>

  <h1>Recibo de Pagamento</h1>

  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Cliente</span>
      <span class="info-value">${parcela.cliente_nome || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Referente a</span>
      <span class="info-value">${veiculoDesc}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Parcela</span>
      <span class="info-value">${numeroParcela} / ${totalParcelas}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Vencimento</span>
      <span class="info-value">${dataVencimento}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Data de Pagamento</span>
      <span class="info-value">${dataPagamento}</span>
    </div>
  </div>

  <div class="valor-destaque">Valor Recebido: ${valor}</div>

  <div class="footer">
    <p style="font-size:11px; color:#666; text-align:center; margin-bottom:20px;">
      Declaro que recebi a importância acima referente ao pagamento da parcela ${numeroParcela}/${totalParcelas}.
    </p>
    <div class="assinatura-row">
      <div class="assinatura-box">
        <div class="assinatura-line"></div>
        <div class="assinatura-label">Carimbo / 判子 (Hanko)</div>
      </div>
      <div class="assinatura-box">
        <div class="assinatura-line"></div>
        <div class="assinatura-label">Assinatura do Responsável</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibo-parcela-${numeroParcela}.pdf"`);
      return res.send(Buffer.from(pdfBuffer));
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[GET /api/financeiro/parcelas/:id/recibo]', err);
    throw err;
  }
}));
// ─────────────────────────────────────────────────────────────────────────────

// ─── Dashboard financeiro do mês atual ───────────────────────────────────────
app.get('/api/financeiro/dashboard/mes', safeRoute(async (_req, res) => {
  let totalRecebidoParcelas = 0;
  let totalPendenteParcelas = 0;
  let totalRecebidoVendasParc = 0;
  let totalPendenteVendasParc = 0;
  let proximasContas = [];

  // Consulta tabela parcelas (vinculada a vendas)
  try {
    const rowsParcelas = await query(
      `SELECT
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) AS totalRecebido,
         SUM(CASE WHEN status != 'pago' THEN valor ELSE 0 END) AS totalPendente
       FROM parcelas
       WHERE MONTH(data_vencimento) = MONTH(CURRENT_DATE())
         AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())`
    );
    totalRecebidoParcelas = Number(rowsParcelas[0]?.totalRecebido || 0);
    totalPendenteParcelas = Number(rowsParcelas[0]?.totalPendente || 0);
  } catch {
    // tabela pode não existir em todos os ambientes
  }

  // Consulta tabela vendas_parcelas (vinculada a contratos de clientes)
  try {
    const rowsVendasParc = await query(
      `SELECT
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) AS totalRecebido,
         SUM(CASE WHEN status != 'pago' THEN valor ELSE 0 END) AS totalPendente
       FROM vendas_parcelas
       WHERE MONTH(data_vencimento) = MONTH(CURRENT_DATE())
         AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())`
    );
    totalRecebidoVendasParc = Number(rowsVendasParc[0]?.totalRecebido || 0);
    totalPendenteVendasParc = Number(rowsVendasParc[0]?.totalPendente || 0);
  } catch {
    // tabela pode não existir em todos os ambientes
  }

  // Próximas 5 contas a receber (de parcelas + vendas_parcelas combinadas)
  try {
    const [nextParcelas, nextVendasParc] = await Promise.all([
      query(
        `SELECT p.id, p.cliente_nome AS clienteNome, p.data_vencimento AS dataVencimento, p.valor, p.status
         FROM parcelas p
         WHERE p.status != 'pago' AND p.data_vencimento >= CURRENT_DATE()
         ORDER BY p.data_vencimento ASC LIMIT 5`
      ).catch(() => []),
      query(
        `SELECT vp.id, c.nome AS clienteNome, vp.data_vencimento AS dataVencimento, vp.valor, vp.status
         FROM vendas_parcelas vp
         JOIN clientes c ON vp.client_id = c.id
         WHERE vp.status != 'pago' AND vp.data_vencimento >= CURRENT_DATE()
         ORDER BY vp.data_vencimento ASC LIMIT 5`
      ).catch(() => []),
    ]);

    proximasContas = [...nextParcelas, ...nextVendasParc]
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
      .slice(0, 5);
  } catch {
    // sem dados disponíveis
  }

  return res.json({
    totalRecebido: totalRecebidoParcelas + totalRecebidoVendasParc,
    totalPendente: totalPendenteParcelas + totalPendenteVendasParc,
    proximasContas,
  });
}));
// ─────────────────────────────────────────────────────────────────────────────


// =============================================================================
// AUTO-MIGRATION: garante que as colunas de email/sendgrid existem em 'configuracoes'
// Roda uma vez na inicialização sem recriar o schema do zero (seguro)
async function garantirColunasEmailNaConfiguracao() {
  const colunas = [
    { coluna: 'sendgrid_api_key', tipo: 'TEXT NULL' },
    { coluna: 'sendgrid_email_remetente', tipo: 'VARCHAR(255) NULL' },
  ];
  for (const { coluna, tipo } of colunas) {
    try {
      await query(`ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS ${coluna} ${tipo}`);
    } catch {
      // MySQL < 8 não suporta IF NOT EXISTS — tenta sem e ignora erro de coluna duplicada
      try {
        await query(`ALTER TABLE configuracoes ADD COLUMN ${coluna} ${tipo}`);
      } catch { /* coluna já existe, tudo bem */ }
    }
  }
}

// =============================================================================
// TRADUÇÕES SIMPLES PARA O EMAIL SEMANAL (espelho mínimo do i18n do frontend)
// Cobre os 4 idiomas da GUI: pt, fil, vi, ja
function traduzirEmailSemanal(idioma) {
  const mapa = {
    pt: {
      assunto: 'Hirata Cars — Contas a Receber desta Semana',
      titulo: 'Contas a Receber',
      subtitulo: 'Resumo semanal de parcelas pendentes',
      colCliente: 'Cliente',
      colParcela: 'Parcela',
      colValor: 'Valor',
      colVencimento: 'Vencimento',
      totalLabel: 'Total a Receber',
      semContas: 'Nenhuma conta a receber esta semana. 🎉',
      rodape: 'Sistema Hirata Cars Shop — gerado automaticamente todo domingo.',
    },
    fil: {
      assunto: 'Hirata Cars — Mga Dapat Bayaran ngayong Linggo',
      titulo: 'Mga Dapat Bayaran',
      subtitulo: 'Lingguhang buod ng mga naaabotang bayad',
      colCliente: 'Kliyente',
      colParcela: 'Hulog',
      colValor: 'Halaga',
      colVencimento: 'Takdang Araw',
      totalLabel: 'Kabuuang Dapat Bayaran',
      semContas: 'Walang dapat bayaran ngayong linggo. 🎉',
      rodape: 'Sistema Hirata Cars Shop — awtomatikong nabubuo tuwing Linggo.',
    },
    vi: {
      assunto: 'Hirata Cars — Các Khoản Phải Thu Tuần Này',
      titulo: 'Các Khoản Phải Thu',
      subtitulo: 'Báo cáo hàng tuần về các khoản đáo hạn',
      colCliente: 'Khách hàng',
      colParcela: 'Khoản',
      colValor: 'Giá trị',
      colVencimento: 'Ngày Đáo Hạn',
      totalLabel: 'Tổng Phải Thu',
      semContas: 'Không có khoản phải thu tuần này. 🎉',
      rodape: 'Hệ thống Hirata Cars Shop — tự động tạo mỗi Chủ nhật.',
    },
    ja: {
      assunto: 'Hirata Cars — 今週の未収金',
      titulo: '未収金一覧',
      subtitulo: '今週の支払期日が来ている分割払いの一覧',
      colCliente: 'お客様',
      colParcela: '支払回数',
      colValor: '金額',
      colVencimento: '支払期日',
      totalLabel: '合計未収金',
      semContas: '今週は支払期日の未収金はありません。🎉',
      rodape: 'Hirata Cars Shop システム — 毎週日曜日に自動生成。',
    },
  };
  return mapa[idioma] || mapa.pt;
}

// Monta o HTML do email semanal no idioma do admin
function montarHtmlEmailSemanal(parcelas, idioma, nomeEmpresa) {
  const tx = traduzirEmailSemanal(idioma);
  const formatJpy = (v) => Number(v || 0).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
  const total = parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);

  const linhas = parcelas.length === 0
    ? `<tr><td colspan="4" style="text-align:center;padding:20px;color:#555">${tx.semContas}</td></tr>`
    : parcelas.map(p => {
        const venc = p.data_vencimento
          ? new Date(p.data_vencimento).toLocaleDateString('ja-JP')
          : '—';
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.cliente_nome || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.numero_parcela || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatJpy(p.valor)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${venc}</td>
          </tr>`;
      }).join('');

  return `
    <!DOCTYPE html>
    <html lang="${idioma}">
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:30px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <!-- Cabeçalho azul da empresa -->
            <tr><td style="background:#1a237e;padding:24px 32px;text-align:center">
              <p style="margin:0;color:#fff;font-size:22px;font-weight:bold">${nomeEmpresa || 'Hirata Cars Shop'}</p>
              <p style="margin:6px 0 0;color:#c5cae9;font-size:13px">${tx.subtitulo}</p>
            </td></tr>
            <!-- Título da seção -->
            <tr><td style="padding:20px 32px 0">
              <h2 style="margin:0;font-size:18px;color:#1a237e">${tx.titulo}</h2>
            </td></tr>
            <!-- Tabela de parcelas -->
            <tr><td style="padding:12px 32px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="background:#e8eaf6">
                    <th style="padding:8px 12px;text-align:left;color:#3949ab">${tx.colCliente}</th>
                    <th style="padding:8px 12px;text-align:center;color:#3949ab">${tx.colParcela}</th>
                    <th style="padding:8px 12px;text-align:right;color:#3949ab">${tx.colValor}</th>
                    <th style="padding:8px 12px;text-align:center;color:#3949ab">${tx.colVencimento}</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </td></tr>
            <!-- Total -->
            ${parcelas.length > 0 ? `
            <tr><td style="padding:16px 32px">
              <table width="100%"><tr>
                <td style="font-weight:bold;color:#333;font-size:14px">${tx.totalLabel}:</td>
                <td style="text-align:right;font-weight:bold;font-size:16px;color:#1b5e20">${formatJpy(total)}</td>
              </tr></table>
            </td></tr>` : ''}
            <!-- Rodapé -->
            <tr><td style="background:#f5f5f5;padding:16px 32px;text-align:center">
              <p style="margin:0;font-size:11px;color:#999">${tx.rodape}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
}

// Alarme de domingo: todo final de semana avisa o chefe o que tem pra receber
async function dispararEmailSemanalContasAReceber() {
  try {
    // Busca configuração do SendGrid no banco
    const cfgRows = await query('SELECT * FROM configuracoes LIMIT 1').catch(() => []);
    const cfg = cfgRows[0] || {};
    const apiKey = (cfg.sendgrid_api_key || '').trim();
    const emailRemetente = (cfg.sendgrid_email_remetente || '').trim();

    // Se chave em branco = serviço desligado silenciosamente
    if (!apiKey || !sgMail) {
      console.log('[EmailSemanal] SendGrid não configurado — serviço desativado.');
      return;
    }

    sgMail.setApiKey(apiKey);

    // Busca todos os admins com email preenchido
    const admins = await query(
      `SELECT nome, email, idioma FROM usuarios WHERE cargo = 'admin' AND email IS NOT NULL AND email != ''`
    ).catch(() => []);

    if (!admins.length) {
      console.log('[EmailSemanal] Nenhum admin com email cadastrado.');
      return;
    }

    // Busca parcelas pendentes da semana corrente (próximos 7 dias)
    const [parcelasPendentes, vendasParcelasPendentes] = await Promise.all([
      query(
        `SELECT p.id, p.cliente_nome, p.numero_parcela, p.valor, p.data_vencimento
         FROM parcelas p
         WHERE p.status != 'pago'
         AND p.data_vencimento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
         ORDER BY p.data_vencimento ASC`
      ).catch(() => []),
      query(
        `SELECT vp.id, c.nome AS cliente_nome, vp.numero_parcela, vp.valor, vp.data_vencimento
         FROM vendas_parcelas vp
         JOIN clientes c ON vp.client_id = c.id
         WHERE vp.status != 'pago'
         AND vp.data_vencimento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
         ORDER BY vp.data_vencimento ASC`
      ).catch(() => []),
    ]);

    const todasParcelas = [...parcelasPendentes, ...vendasParcelasPendentes]
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

    const nomeEmpresa = cfg.nomeEmpresa || 'Hirata Cars Shop';

    // Envia email para cada admin no seu próprio idioma
    for (const admin of admins) {
      const idioma = admin.idioma || 'pt';
      const tx = traduzirEmailSemanal(idioma);
      const htmlBody = montarHtmlEmailSemanal(todasParcelas, idioma, nomeEmpresa);

      try {
        await sgMail.send({
          to: admin.email,
          from: emailRemetente,
          subject: tx.assunto,
          html: htmlBody,
        });
        console.log(`[EmailSemanal] Enviado para ${admin.email} (idioma: ${idioma}).`);
      } catch (mailErr) {
        console.error(`[EmailSemanal] Erro ao enviar para ${admin.email}:`, mailErr.message);
      }
    }
  } catch (err) {
    console.error('[EmailSemanal] Erro geral no envio do email semanal:', err.message);
  }
}

// Calcula quantos ms faltam até o próximo domingo às 08:00 (horário do servidor)
function msPapaProximoDomingoOito() {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0=dom, 1=seg...
  const diasParaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
  const proximoDomingo = new Date(agora);
  proximoDomingo.setDate(agora.getDate() + diasParaDomingo);
  proximoDomingo.setHours(8, 0, 0, 0);
  // Se já passou das 08h do domingo atual, pula para o próximo
  if (proximoDomingo <= agora) proximoDomingo.setDate(proximoDomingo.getDate() + 7);
  return proximoDomingo.getTime() - agora.getTime();
}

// Ativa o alarme do domingo quando o servidor inicializar
function ativarCronEmailDomingo() {
  const msParaPrimeiro = msPapaProximoDomingoOito();
  console.log(`[EmailSemanal] Próximo envio em ${Math.round(msParaPrimeiro / 1000 / 60)} minutos.`);
  setTimeout(async () => {
    await dispararEmailSemanalContasAReceber();
    // Após o primeiro envio, repete a cada 7 dias exatos
    setInterval(dispararEmailSemanalContasAReceber, 7 * 24 * 60 * 60 * 1000);
  }, msParaPrimeiro);
}

// =============================================================================
// ROTA: GET /api/calendario/vencimentos?ano=YYYY&mes=MM
// Retorna vencimentos do mês agrupados por dia para preencher o calendário
app.get('/api/calendario/vencimentos', safeRoute(async (req, res) => {
  const ano = parseInt(req.query.ano) || new Date().getFullYear();
  const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);

  // Consulta parcelas (vinculadas a vendas de gestão)
  const parcelasMes = await query(
    `SELECT p.id, p.cliente_nome, p.numero_parcela, p.valor, p.data_vencimento, p.status,
            'parcelas' AS origem
     FROM parcelas p
     WHERE YEAR(p.data_vencimento) = ? AND MONTH(p.data_vencimento) = ?
     ORDER BY p.data_vencimento ASC`,
    [ano, mes]
  ).catch(() => []);

  // Consulta vendas_parcelas (vinculadas a contratos de clientes)
  const vendasParcelasMes = await query(
    `SELECT vp.id, c.nome AS cliente_nome, vp.numero_parcela, vp.valor, vp.data_vencimento, vp.status,
            'vendas_parcelas' AS origem
     FROM vendas_parcelas vp
     JOIN clientes c ON vp.client_id = c.id
     WHERE YEAR(vp.data_vencimento) = ? AND MONTH(vp.data_vencimento) = ?
     ORDER BY vp.data_vencimento ASC`,
    [ano, mes]
  ).catch(() => []);

  // Agrupa tudo por dia do mês
  const agrupado = {};
  for (const item of [...parcelasMes, ...vendasParcelasMes]) {
    const dia = new Date(item.data_vencimento).getDate();
    if (!agrupado[dia]) agrupado[dia] = [];
    agrupado[dia].push({
      id: item.id,
      clienteNome: item.cliente_nome || '—',
      numeroParcela: item.numero_parcela,
      valor: Number(item.valor || 0),
      dataVencimento: item.data_vencimento,
      status: item.status || 'pendente',
      origem: item.origem,
    });
  }

  return res.json({ ano, mes, vencimentos: agrupado });
}));

// =============================================================================
// ROTA: PUT /api/calendario/parcelas/:id/baixa?origem=parcelas|vendas_parcelas
// Marca a parcela como paga — funciona para ambas as tabelas
app.put('/api/calendario/parcelas/:id/baixa', safeRoute(async (req, res) => {
  const { id } = req.params;
  const origem = req.query.origem === 'vendas_parcelas' ? 'vendas_parcelas' : 'parcelas';

  const rows = await query(`SELECT id FROM ${origem} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return res.status(404).json({ message: 'Parcela não encontrada' });

  await query(
    `UPDATE ${origem} SET status = 'pago', data_pagamento = CURRENT_DATE() WHERE id = ?`,
    [id]
  );

  const updated = await query(`SELECT * FROM ${origem} WHERE id = ? LIMIT 1`, [id]);
  return res.json({ ok: true, parcela: updated[0] });
}));

// =============================================================================
// ROTA: PUT /api/calendario/parcelas/:id/remarcar?origem=parcelas|vendas_parcelas
// Altera a data de vencimento de uma parcela específica (pedido do cliente)
app.put('/api/calendario/parcelas/:id/remarcar', safeRoute(async (req, res) => {
  const { id } = req.params;
  const origem = req.query.origem === 'vendas_parcelas' ? 'vendas_parcelas' : 'parcelas';
  const { novaData } = req.body || {};

  if (!novaData || !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
    return res.status(400).json({ message: 'novaData inválida. Use o formato YYYY-MM-DD.' });
  }

  const rows = await query(`SELECT id FROM ${origem} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return res.status(404).json({ message: 'Parcela não encontrada' });

  await query(`UPDATE ${origem} SET data_vencimento = ? WHERE id = ?`, [novaData, id]);

  const updated = await query(`SELECT * FROM ${origem} WHERE id = ? LIMIT 1`, [id]);
  return res.json({ ok: true, parcela: updated[0] });
}));

// =============================================================================
// ROTA: GET /api/sendgrid/config — lê configuração SendGrid (somente admin)
app.get('/api/sendgrid/config', safeRoute(async (req, res) => {
  const cfgRows = await query('SELECT sendgrid_api_key, sendgrid_email_remetente FROM configuracoes LIMIT 1').catch(() => []);
  const cfg = cfgRows[0] || {};
  // Retorna a chave mascarada (só os primeiros 8 chars) por segurança
  const apiKeyPreview = (cfg.sendgrid_api_key || '').length > 8
    ? cfg.sendgrid_api_key.slice(0, 8) + '••••••••••••••••••••'
    : '';
  return res.json({
    apiKeyConfigurada: !!(cfg.sendgrid_api_key || '').trim(),
    apiKeyPreview,
    emailRemetente: cfg.sendgrid_email_remetente || '',
  });
}));

// =============================================================================
// ROTA: PUT /api/sendgrid/config — salva configuração SendGrid (somente admin)
app.put('/api/sendgrid/config', safeRoute(async (req, res) => {
  const { apiKey, emailRemetente } = req.body || {};
  const cfgRows = await query('SELECT id FROM configuracoes LIMIT 1').catch(() => []);
  if (!cfgRows.length) {
    return res.status(404).json({ message: 'Configuração não encontrada' });
  }
  await query(
    'UPDATE configuracoes SET sendgrid_api_key = ?, sendgrid_email_remetente = ? WHERE id = ?',
    [apiKey || '', emailRemetente || '', cfgRows[0].id]
  );
  return res.json({ ok: true });
}));

// =============================================================================
// ROTA: POST /api/sendgrid/testar-chave — dispara um email de teste
// Usado pelo admin para verificar se a API Key está funcionando
app.post('/api/sendgrid/testar-chave', safeRoute(async (req, res) => {
  const { apiKey, emailDestino, idioma } = req.body || {};
  let keyParaUsar = (apiKey || '').trim();

  if (!emailDestino) {
    return res.status(400).json({ ok: false, error: 'emailDestino é obrigatório' });
  }

  // Se não foi informada chave, ou se é a chave mascarada de visualização (contém bolinhas), pega do banco
  if (!keyParaUsar || keyParaUsar.includes('••')) {
    const cfgRows = await query('SELECT sendgrid_api_key FROM configuracoes LIMIT 1').catch(() => []);
    const cfg = cfgRows[0] || {};
    keyParaUsar = (cfg.sendgrid_api_key || '').trim();
  }

  if (!keyParaUsar) {
    return res.status(400).json({ ok: false, error: 'Chave API do SendGrid não configurada nem informada.' });
  }

  if (!sgMail) {
    return res.status(503).json({ ok: false, error: 'Pacote @sendgrid/mail não está instalado no servidor.' });
  }

  try {
    sgMail.setApiKey(keyParaUsar);
    const tx = traduzirEmailSemanal(idioma || 'pt');
    const cfgRows = await query('SELECT nomeEmpresa, sendgrid_email_remetente FROM configuracoes LIMIT 1').catch(() => []);
    const cfg = cfgRows[0] || {};
    const remetente = cfg.sendgrid_email_remetente || emailDestino;
    const nomeEmpresa = cfg.nomeEmpresa || 'Hirata Cars Shop';

    await sgMail.send({
      to: emailDestino,
      from: remetente,
      subject: `[TESTE] ${tx.assunto}`,
      html: montarHtmlEmailSemanal([], idioma || 'pt', nomeEmpresa),
    });
    return res.json({ ok: true });
  } catch (err) {
    const detalhe = err?.response?.body?.errors?.[0]?.message || err.message;
    return res.status(400).json({ ok: false, error: detalhe });
  }
}));

// =============================================================================
Object.entries(ENTITY_ROUTES).forEach(([resource, entityDef]) => {
  // Pular recursos com rotas POST customizadas
  if (resource === 'vendas_carros') return;
  if (resource === 'documentos') return;
  registerEntityRoutes(resource, entityDef);
});

// Registrar rota genérica para vendas_carros (GET, PUT, PATCH, DELETE), POST já está customizado
registerEntityRoutes('vendas_carros', ENTITY_ROUTES.vendas_carros);

// Registrar rotas genéricas para documentos (GET list, GET/:id, PUT, PATCH, DELETE), POST já está customizado
registerEntityRoutes('documentos', ENTITY_ROUTES.documentos);

// ─── Servir Frontend React (dist) ─────────────────────────────────────────────
// O build do Vite gera os arquivos em <raiz>/dist. Em produção, o backend
// serve esses arquivos estáticos e redireciona qualquer rota desconhecida
// para o index.html, garantindo que o React Router funcione corretamente.
const DIST_PATH = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  // Fallback SPA — deve vir DEPOIS de todas as rotas de API
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
  console.log(`[Static] Servindo frontend em: ${DIST_PATH}`);
} else {
  console.warn(`[Static] Pasta dist não encontrada em: ${DIST_PATH}. Rode "npm run build" na raiz do projeto.`);
}
// ──────────────────────────────────────────────────────────────────────────────

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
    // Garante que as colunas de SendGrid existam na tabela de configurações
    await garantirColunasEmailNaConfiguracao().catch((e) => console.warn('[AutoMigration] Aviso:', e.message));
    // Ativa o alarme do domingo para emails semanais de contas a receber
    ativarCronEmailDomingo();
  } catch (error) {
    console.error('Falha ao conectar no MySQL:', error.message);
  }
});

