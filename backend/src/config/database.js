const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool(env.db);

function normalizeDatabaseError(error) {
  if (!error) return error;

  if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || error.code === 'ETIMEDOUT') {
    return Object.assign(new Error(`Tempo limite excedido ao consultar o banco de dados. [${error.code}]`), {
      statusCode: 504,
      code: error.code,
      originalMessage: error.message,
    });
  }

  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'PROTOCOL_CONNECTION_LOST' ||
    error.code === 'ER_ACCESS_DENIED_ERROR' ||
    error.code === 'ENOTFOUND'
  ) {
    // Expõe o erro original do MySQL para diagnóstico preciso nos logs do PM2
    return Object.assign(
      new Error(`Falha de conexão com o banco de dados. [${error.code}] ${error.message}`),
      {
        statusCode: 503,
        code: error.code,
        originalMessage: error.message,
      }
    );
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
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    return true;
  } catch (error) {
    // Imprime o erro original do MySQL nos logs — não mascara com mensagem genérica
    console.error('[DB] Falha na conexão com MySQL:');
    console.error(`  Código : ${error.code}`);
    console.error(`  Mensagem: ${error.message}`);
    console.error(`  Host    : ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.error(`  Usuário : ${process.env.DB_USER}`);
    console.error(`  Banco   : ${process.env.DB_NAME}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  normalizeDatabaseError,
};
