#!/usr/bin/env node

/**
 * Script de Validação das Alterações de CRM
 * 
 * Executa verificações para garantir que todas as alterações
 * foram implementadas corretamente.
 */

const fs = require('fs');
const path = require('path');

const checks = [];

function check(name, condition, details = '') {
  checks.push({
    name,
    passed: condition,
    details
  });
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details && !condition) console.log(`   → ${details}`);
}

console.log('\n🔍 VALIDANDO ALTERAÇÕES DO CRM...\n');

// 1. Verificar arquivos criados
console.log('📁 Verificando Arquivos...');
check('Backend: upload.js', fs.existsSync(path.join(__dirname, 'backend/src/config/upload.js')));
check('Backend: clientCrm.js', fs.existsSync(path.join(__dirname, 'backend/src/routes/clientCrm.js')));
check('Frontend: ClientCrmDialog.tsx', fs.existsSync(path.join(__dirname, 'src/components/ClientCrmDialog.tsx')));

// 2. Verificar conteúdo do schema.sql
console.log('\n📊 Verificando Schema.sql...');
const schemaPath = path.join(__dirname, 'backend/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

check('Novo campo: cnh_number', schema.includes('cnh_number VARCHAR(20)'));
check('Novo campo: observacoes_gerais', schema.includes('observacoes_gerais TEXT'));
check('Nova tabela: client_interactions', schema.includes('CREATE TABLE client_interactions'));
check('Nova tabela: client_documents', schema.includes('CREATE TABLE client_documents'));

// 3. Verificar dependências no package.json
console.log('\n📦 Verificando Dependências...');
const pkgPath = path.join(__dirname, 'backend/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

check('Multer instalado', pkg.dependencies.multer !== undefined);
check('UUID instalado', pkg.dependencies.uuid !== undefined);

// 4. Verificar rotas no server.js
console.log('\n🛣️ Verificando Rotas...');
const serverPath = path.join(__dirname, 'backend/src/server.js');
const serverContent = fs.readFileSync(serverPath, 'utf-8');

check('ClientCRM router importado', serverContent.includes('clientCrmRouter'));
check('ClientCRM router registrado', serverContent.includes("app.use('/api', clientCrmRouter)"));

// 5. Verificar componente frontend
console.log('\n🎨 Verificando Frontend...');
const crmDialogPath = path.join(__dirname, 'src/components/ClientCrmDialog.tsx');
const crmDialogContent = fs.readFileSync(crmDialogPath, 'utf-8');

check('ClientCrmDialog exportado', crmDialogContent.includes('export default ClientCrmDialog'));
check('Upload de documentos', crmDialogContent.includes('handleFileUpload'));
check('Histórico de atendimento', crmDialogContent.includes('handleAddInteraction'));

// 6. Verificar Clientes.tsx atualizado
console.log('\n👥 Verificando Página Clientes...');
const clientesPath = path.join(__dirname, 'src/pages/Clientes.tsx');
const clientesContent = fs.readFileSync(clientesPath, 'utf-8');

check('ClientCrmDialog importado', clientesContent.includes('ClientCrmDialog'));
check('Campo CNH na interface', clientesContent.includes('cnh_number'));
check('Campo observações na interface', clientesContent.includes('observacoes_gerais'));
check('Botão CRM na tabela', clientesContent.includes('AssignmentIcon'));

// Resumo
console.log('\n' + '='.repeat(50));
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
const percentage = ((passed / total) * 100).toFixed(1);

console.log(`✨ Resultado: ${passed}/${total} verificações passaram (${percentage}%)`);

if (passed === total) {
  console.log('\n✅ TODAS AS ALTERAÇÕES FORAM IMPLEMENTADAS COM SUCESSO!');
  console.log('\nPróximos passos:');
  console.log('1. npm install (no diretório backend)');
  console.log('2. Executar schema.sql no MySQL');
  console.log('3. npm run dev (iniciar servidor backend)');
  console.log('4. Testar as funcionalidades no navegador');
} else {
  console.log('\n⚠️  ALGUMAS VERIFICAÇÕES FALHARAM');
  console.log('Verifique os erros acima e tente novamente.');
  process.exit(1);
}

console.log('='.repeat(50) + '\n');
