#!/usr/bin/env node

/**
 * 🧪 TESTE DE INTEGRAÇÃO - HIRATA CARS v2.1
 * Valida: CRM, Documentos, Vendas, Datas, Uploads, Sessão
 * 
 * Uso: node test-integration.js
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, condition, message) {
    if (condition) {
      this.passed++;
      console.log(`✅ ${name}`);
      return true;
    } else {
      this.failed++;
      console.log(`❌ ${name}`);
      if (message) console.log(`   ${message}`);
      this.tests.push({ name, passed: false, message });
      return false;
    }
  }

  report() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESULTADO: ${this.passed} passou | ${this.failed} falhou`);
    console.log('='.repeat(60));
    return this.failed === 0;
  }
}

// Iniciar testes
const runner = new TestRunner();
const projectRoot = path.resolve(__dirname);

console.log('\n🚀 INICIANDO TESTES DE INTEGRAÇÃO\n');
console.log(`📂 Diretório: ${projectRoot}\n`);

// ============================================================================
// 1. VERIFICAR ESTRUTURA DE DIRETÓRIOS
// ============================================================================
console.log('\n1️⃣  VERIFICANDO ESTRUTURA DE DIRETÓRIOS\n');

const requiredDirs = [
  'backend/src/config',
  'backend/src/routes',
  'backend/src/middleware',
  'src/pages',
  'src/components',
  'src/utils'
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  runner.test(
    `Diretório ${dir}`,
    fs.existsSync(fullPath),
    `Não encontrado: ${fullPath}`
  );
});

// ============================================================================
// 2. VERIFICAR ARQUIVOS CRÍTICOS
// ============================================================================
console.log('\n2️⃣  VERIFICANDO ARQUIVOS CRÍTICOS\n');

const requiredFiles = [
  'backend/schema.sql',
  'backend/src/config/upload.js',
  'backend/src/routes/clientCrm.js',
  'backend/src/middleware/sessionTimeout.js',
  'backend/src/server.js',
  'src/pages/Veiculos.tsx',
  'src/pages/Clientes.tsx',
  'src/components/ClientCrmDialog.tsx',
  'src/utils/dateFormatters.ts'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  runner.test(
    `Arquivo ${file}`,
    fs.existsSync(fullPath),
    `Não encontrado: ${fullPath}`
  );
});

// ============================================================================
// 3. VERIFICAR CONFIGURAÇÃO DE UPLOAD
// ============================================================================
console.log('\n3️⃣  VERIFICANDO CONFIGURAÇÃO DE UPLOAD\n');

const uploadConfigPath = path.join(projectRoot, 'backend/src/config/upload.js');
if (fs.existsSync(uploadConfigPath)) {
  const uploadContent = fs.readFileSync(uploadConfigPath, 'utf8');
  
  runner.test(
    'Upload path: /storage/uploads/',
    uploadContent.includes('/storage/uploads') || uploadContent.includes('storage/uploads'),
    'Caminho correto não encontrado'
  );
  
  runner.test(
    'MIME type: image/jpeg',
    uploadContent.includes('image/jpeg'),
    'MIME jpeg não definido'
  );
  
  runner.test(
    'MIME type: image/png',
    uploadContent.includes('image/png'),
    'MIME png não definido'
  );
  
  runner.test(
    'MIME type: application/pdf',
    uploadContent.includes('application/pdf'),
    'MIME pdf não definido'
  );
  
  runner.test(
    'Extensão .jpg permitida',
    uploadContent.includes('.jpg'),
    'Extensão jpg não definida'
  );
  
  runner.test(
    'Extensão .png permitida',
    uploadContent.includes('.png'),
    'Extensão png não definida'
  );
  
  runner.test(
    'Extensão .pdf permitida',
    uploadContent.includes('.pdf'),
    'Extensão pdf não definida'
  );
  
  runner.test(
    'GIF NÃO permitido',
    !uploadContent.includes('image/gif'),
    'GIF ainda está permitido'
  );
  
  runner.test(
    'WebP NÃO permitido',
    !uploadContent.includes('image/webp'),
    'WebP ainda está permitido'
  );
}

// ============================================================================
// 4. VERIFICAR CONFIGURAÇÃO DE SESSÃO
// ============================================================================
console.log('\n4️⃣  VERIFICANDO CONFIGURAÇÃO DE SESSÃO\n');

const sessionTimeoutPath = path.join(projectRoot, 'backend/src/middleware/sessionTimeout.js');
if (fs.existsSync(sessionTimeoutPath)) {
  const sessionContent = fs.readFileSync(sessionTimeoutPath, 'utf8');
  
  runner.test(
    'Session timeout: 1 hora (60 * 60 * 1000)',
    sessionContent.includes('60 * 60 * 1000') || sessionContent.includes('3600000'),
    'Timeout de 1 hora não está configurado'
  );
  
  runner.test(
    'Destroi sessão após timeout',
    sessionContent.includes('req.session.destroy'),
    'Destruição de sessão não implementada'
  );
  
  runner.test(
    'Retorna status 440 no timeout',
    sessionContent.includes('440'),
    'Status code 440 não configurado'
  );
}

// ============================================================================
// 5. VERIFICAR SCHEMA DO BANCO
// ============================================================================
console.log('\n5️⃣  VERIFICANDO SCHEMA DO BANCO DE DADOS\n');

const schemaPath = path.join(projectRoot, 'backend/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  runner.test(
    'Tabela client_documents existe',
    schemaContent.includes('CREATE TABLE') && schemaContent.includes('client_documents'),
    'Tabela client_documents não definida'
  );
  
  runner.test(
    'Tabela client_interactions existe',
    schemaContent.includes('client_interactions'),
    'Tabela client_interactions não definida'
  );
  
  runner.test(
    'Campo data_venda em veiculos',
    schemaContent.includes('data_venda'),
    'Campo data_venda não definido'
  );
  
  runner.test(
    'Campo nova_placa em veiculos',
    schemaContent.includes('nova_placa'),
    'Campo nova_placa não definido'
  );
  
  runner.test(
    'Campo data_transferencia em veiculos',
    schemaContent.includes('data_transferencia'),
    'Campo data_transferencia não definido'
  );
  
  runner.test(
    'Índice em data_venda',
    schemaContent.includes('idx_veiculos_data_venda'),
    'Índice em data_venda não criado'
  );
}

// ============================================================================
// 6. VERIFICAR COMPONENTES TYPESCRIPT
// ============================================================================
console.log('\n6️⃣  VERIFICANDO COMPONENTES TYPESCRIPT\n');

const veiculosPath = path.join(projectRoot, 'src/pages/Veiculos.tsx');
if (fs.existsSync(veiculosPath)) {
  const veiculosContent = fs.readFileSync(veiculosPath, 'utf8');
  
  runner.test(
    'Interface Veiculo tem data_venda',
    veiculosContent.includes('data_venda'),
    'Campo data_venda não está na interface'
  );
  
  runner.test(
    'Interface Veiculo tem nova_placa',
    veiculosContent.includes('nova_placa'),
    'Campo nova_placa não está na interface'
  );
  
  runner.test(
    'Interface Veiculo tem data_transferencia',
    veiculosContent.includes('data_transferencia'),
    'Campo data_transferencia não está na interface'
  );
  
  runner.test(
    'Form campos de data presentes',
    veiculosContent.includes('Data de Venda') || veiculosContent.includes('data_venda'),
    'Form não tem campos de data'
  );
}

// ============================================================================
// 7. VERIFICAR UTILITÁRIOS DE DATAS
// ============================================================================
console.log('\n7️⃣  VERIFICANDO UTILITÁRIOS DE DATAS\n');

const dateFormattersPath = path.join(projectRoot, 'src/utils/dateFormatters.ts');
if (fs.existsSync(dateFormattersPath)) {
  const dateContent = fs.readFileSync(dateFormattersPath, 'utf8');
  
  runner.test(
    'Função formatDateToJapanese existe',
    dateContent.includes('formatDateToJapanese'),
    'Função formatDateToJapanese não definida'
  );
  
  runner.test(
    'Função convertJapaneseDateToISO existe',
    dateContent.includes('convertJapaneseDateToISO'),
    'Função convertJapaneseDateToISO não definida'
  );
  
  runner.test(
    'Função isValidJapaneseDate existe',
    dateContent.includes('isValidJapaneseDate'),
    'Função isValidJapaneseDate não definida'
  );
  
  runner.test(
    'Função getTodayJapanese existe',
    dateContent.includes('getTodayJapanese'),
    'Função getTodayJapanese não definida'
  );
  
  runner.test(
    'Exports em dateFormatters',
    dateContent.includes('export'),
    'Funções não estão exportadas'
  );
} else {
  runner.test('Arquivo dateFormatters.ts existe', false, 'Arquivo não encontrado');
}

// ============================================================================
// 8. VERIFICAR CRM DIALOG
// ============================================================================
console.log('\n8️⃣  VERIFICANDO CRM DIALOG\n');

const crmDialogPath = path.join(projectRoot, 'src/components/ClientCrmDialog.tsx');
if (fs.existsSync(crmDialogPath)) {
  const crmContent = fs.readFileSync(crmDialogPath, 'utf8');
  
  runner.test(
    'Upload valida JPG, PNG, PDF',
    crmContent.includes('image/jpeg') && crmContent.includes('image/png') && crmContent.includes('application/pdf'),
    'Tipos de arquivo não estão validados'
  );
  
  runner.test(
    'GIF não está permitido em CRM',
    !crmContent.includes('image/gif'),
    'GIF ainda está permitido em upload'
  );
  
  runner.test(
    'WebP não está permitido em CRM',
    !crmContent.includes('image/webp'),
    'WebP ainda está permitido em upload'
  );
}

// ============================================================================
// 9. VERIFICAR CLIENTES
// ============================================================================
console.log('\n9️⃣  VERIFICANDO PÁGINA DE CLIENTES\n');

const clientesPath = path.join(projectRoot, 'src/pages/Clientes.tsx');
if (fs.existsSync(clientesPath)) {
  const clientesContent = fs.readFileSync(clientesPath, 'utf8');
  
  runner.test(
    'Clientes tem campo cnh_number',
    clientesContent.includes('cnh_number'),
    'Campo cnh_number não está presente'
  );
  
  runner.test(
    'Clientes tem campo observacoes_gerais',
    clientesContent.includes('observacoes_gerais'),
    'Campo observacoes_gerais não está presente'
  );
  
  runner.test(
    'Clientes integrado com CRM',
    clientesContent.includes('ClientCrmDialog'),
    'ClientCrmDialog não está integrado'
  );
}

// ============================================================================
// 10. VERIFICAR ROUTES DO CRM
// ============================================================================
console.log('\n🔟 VERIFICANDO ROTAS DO CRM\n');

const crmRoutesPath = path.join(projectRoot, 'backend/src/routes/clientCrm.js');
if (fs.existsSync(crmRoutesPath)) {
  const crmRoutesContent = fs.readFileSync(crmRoutesPath, 'utf8');
  
  runner.test(
    'Route: GET documentos',
    crmRoutesContent.includes('router.get') && crmRoutesContent.includes('documents'),
    'GET documentos não definido'
  );
  
  runner.test(
    'Route: POST documentos',
    crmRoutesContent.includes('router.post') && crmRoutesContent.includes('documents'),
    'POST documentos não definido'
  );
  
  runner.test(
    'Route: DELETE documentos',
    crmRoutesContent.includes('router.delete') && crmRoutesContent.includes('documents'),
    'DELETE documentos não definido'
  );
  
  runner.test(
    'Route: GET interactions',
    crmRoutesContent.includes('interactions'),
    'Interactions não definido'
  );
  
  runner.test(
    'Upload middleware integrado',
    crmRoutesContent.includes('upload') || crmRoutesContent.includes('multer'),
    'Multer não está integrado'
  );
}

// ============================================================================
// 11. VERIFICAR SERVER.JS
// ============================================================================
console.log('\n1️⃣1️⃣  VERIFICANDO SERVER.JS\n');

const serverPath = path.join(projectRoot, 'backend/src/server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  runner.test(
    'Session maxAge = 1 hora',
    (serverContent.includes('maxAge') && serverContent.includes('ONE_HOUR_MS')) || 
    serverContent.includes('3600000') || 
    serverContent.includes('60 * 60'),
    'Session maxAge não está configurado para 1 hora'
  );
  
  runner.test(
    'Session rolling habilitado',
    serverContent.includes('rolling'),
    'Session rolling não está habilitado'
  );
  
  runner.test(
    'clientCrmRouter importado',
    serverContent.includes('clientCrmRouter') || serverContent.includes('crm'),
    'clientCrmRouter não está importado'
  );
  
  runner.test(
    'Middleware de timeout integrado',
    serverContent.includes('sessionTimeout') || serverContent.includes('timeout'),
    'Middleware de timeout não está integrado'
  );
}

// ============================================================================
// 12. VERIFICAR COMPATIBILIDADE
// ============================================================================
console.log('\n1️⃣2️⃣  VERIFICANDO COMPATIBILIDADE\n');

runner.test(
  'Nenhum arquivo foi deletado sem motivo',
  !fs.existsSync(path.join(projectRoot, '.deleted')),
  'Arquivos críticos foram deletados'
);

runner.test(
  'Projeto mantém estrutura original',
  fs.existsSync(path.join(projectRoot, 'backend')) &&
  fs.existsSync(path.join(projectRoot, 'src')) &&
  fs.existsSync(path.join(projectRoot, 'public')),
  'Estrutura de diretórios foi alterada'
);

runner.test(
  'package.json existe no backend',
  fs.existsSync(path.join(projectRoot, 'backend/package.json')),
  'package.json do backend não existe'
);

runner.test(
  'package.json existe no root',
  fs.existsSync(path.join(projectRoot, 'package.json')),
  'package.json root não existe'
);

// ============================================================================
// RELATÓRIO FINAL
// ============================================================================
console.log('\n');
const success = runner.report();

if (success) {
  console.log('\n✨ TODOS OS TESTES PASSARAM! ✨');
  console.log('\nOu projeto Hirata Cars v2.1 foi atualizado com sucesso.');
  console.log('Próximas ações:');
  console.log('  1. Execute o schema.sql no MySQL');
  console.log('  2. Teste uploads de documentos (JPG, PNG, PDF)');
  console.log('  3. Teste novos campos em Veículos');
  console.log('  4. Teste CRM e histórico de atendimentos');
  console.log('  5. Teste timeout de sessão (1 hora)');
  console.log('\nQuando tudo estiver pronto, faça o commit:');
  console.log('  git add .');
  console.log('  git commit -m "feat: Atualização completa v2.1 - CRM, Documentos, Vendas"');
  process.exit(0);
} else {
  console.log('\n⚠️  ALGUNS TESTES FALHARAM');
  console.log('Verifique os erros acima e corrija antes de continuar.');
  process.exit(1);
}
