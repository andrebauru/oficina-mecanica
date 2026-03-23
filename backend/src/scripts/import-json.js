const fs = require('fs/promises');
const path = require('path');
const { query } = require('../config/database');
const { collectionConfig, toDatabaseRecord } = require('../config/entities');

const importOrder = [
  'configuracoes',
  'usuarios',
  'clientes',
  'veiculos',
  'servicos',
  'pecas',
  'categorias_financeiro',
  'financeiro',
  'agendamentos',
  'ordens_servico',
  'vendas_carros',
  'vendas',
  'parcelas',
  'documentos',
];

async function loadJsonDb() {
  const jsonPath = path.resolve(__dirname, '../../../db.json');
  const raw = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(raw);
}

async function clearTables() {
  await query('SET FOREIGN_KEY_CHECKS = 0');
  for (const collection of [...importOrder].reverse()) {
    const entity = collectionConfig[collection];
    if (!entity) continue;
    await query(`DELETE FROM ${entity.table}`);
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');
}

async function importCollection(collectionName, items) {
  const entity = collectionConfig[collectionName];
  if (!entity || !Array.isArray(items) || items.length === 0) return 0;

  let count = 0;
  for (const item of items) {
    const dbRecord = toDatabaseRecord(collectionName, item);
    const columns = Object.keys(dbRecord);
    const values = columns.map(c => dbRecord[c]);
    const placeholders = columns.map(() => '?').join(', ');

    await query(
      `INSERT INTO ${entity.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    count += 1;
  }

  return count;
}

async function run() {
  const jsonDb = await loadJsonDb();

  await clearTables();

  const report = {};
  for (const collection of importOrder) {
    const total = await importCollection(collection, jsonDb[collection] || []);
    report[collection] = total;
  }

  console.log('Importação concluída com sucesso.');
  Object.entries(report).forEach(([collection, total]) => {
    console.log(`- ${collection}: ${total} registro(s)`);
  });
}

run().catch(error => {
  console.error('Falha na importação:', error);
  process.exitCode = 1;
});
