const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool(env.db);

function normalizeDatabaseError(error) {
  if (!error) return error;

  if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || error.code === 'ETIMEDOUT') {
    return Object.assign(new Error('Tempo limite excedido ao consultar o banco de dados.'), {
      statusCode: 504,
      code: error.code,
    });
  }

  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'PROTOCOL_CONNECTION_LOST' ||
    error.code === 'ER_ACCESS_DENIED_ERROR' ||
    error.code === 'ENOTFOUND'
  ) {
    return Object.assign(new Error('Falha de conexão com o banco de dados.'), {
      statusCode: 503,
      code: error.code,
    });
  }

  return error;
}

async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute({
      sql,
      timeout: env.dbQueryTimeout,
    }, params);
    return rows;
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  normalizeDatabaseError,
};
