const path = require('path');
// NOTA: dotenv já foi carregado com override:true no topo de server.js.
// Não recarregar aqui para não sobrescrever process.env com valores de um .env diferente.

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: Number(process.env.API_PORT || 3001),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },
  dbQueryTimeout: Number(process.env.DB_QUERY_TIMEOUT || 10000),
  sessionSecret: required('SESSION_SECRET', 'troque-por-uma-chave-forte'),
};

module.exports = env;
