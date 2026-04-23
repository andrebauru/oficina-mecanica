const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hirata_cars'
};

async function setupAdmin() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Conectado ao banco de dados:', config.database);

    // Hash bcrypt para admin123
    const senhaHash = '$2b$10$I6Cy92Ug/8QTkHrSwPo8/eG25x5QzP1cbPVZymdkeQvoEn92tqeX.';
    
    // Tentar inserir ou atualizar
    const [result] = await connection.execute(
      `INSERT INTO usuarios (id, nome, email, idioma, cargo, senhaHash, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       nome = ?, email = ?, idioma = ?, cargo = ?, senhaHash = ?, updatedAt = NOW()`,
      [
        'usr-admin-001', 'Administrador', 'admin@hiratacars.jp', 'pt', 'admin', senhaHash,
        'Administrador', 'admin@hiratacars.jp', 'pt', 'admin', senhaHash
      ]
    );
    console.log('✓ Usuário admin criado/atualizado');

    // Verificar
    const [rows] = await connection.execute(
      'SELECT id, nome, email, cargo FROM usuarios WHERE email = ?',
      ['admin@hiratacars.jp']
    );
    if (rows.length > 0) {
      console.log('✓ Usuário verificado:', rows[0]);
    }

    // Testar bcrypt.compare
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, senhaHash);
    console.log('✓ Teste bcrypt.compare(admin123, hash):', isValid);

    console.log('\n✅ Setup concluído!');
    console.log('Credenciais de login:');
    console.log('  Email: admin@hiratacars.jp');
    console.log('  Senha: admin123');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupAdmin();
