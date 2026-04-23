# Guia de Execução: Padronização camelCase do Banco de Dados

## 🚀 Roadmap de Execução

Este guia detalha passo a passo como executar a padronização completa do banco de dados Hirata Cars de **snake_case** para **camelCase**.

---

## FASE 0: PRÉ-REQUISITOS (15 minutos)

### Verificar Ambiente

```bash
# 1. Verificar MySQL está rodando
mysql -u root -p -e "SELECT VERSION();"

# Esperado: mysql  Ver 8.0.xx ou MariaDB 10.5+
```

```bash
# 2. Verificar banco hirata_cars existe
mysql -u root -p -e "USE hirata_cars; SELECT COUNT(*) as tables FROM INFORMATION_SCHEMA.TABLES;"

# Esperado: tables = 20+ tabelas
```

```bash
# 3. Verificar permissões de usuario
mysql -u root -p -e "SHOW GRANTS FOR 'root'@'localhost';"

# Esperado: SUPER, ALTER, CREATE, DROP, etc.
```

### Preparar Ambiente

```bash
# 1. Parar aplicação backend
cd d:\Programacao\oficina-mecanica\backend
npm stop
# ou Ctrl+C se em desenvolvimento

# 2. Parar frontend (se necessário)
# Parar o servidor Vite (Ctrl+C)

# 3. Abrir terminal NOVO para monitoramento
# (deixar aberto durante todo o processo)
```

---

## FASE 1: BACKUP OBRIGATÓRIO (10 minutos)

### Criar Backup Completo

```bash
# Navegar para diretório de backups
cd d:\Programacao\oficina-mecanica\backups

# Criar timestamp
# Windows PowerShell:
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Executar dump completo
mysql -u root -p hirata_cars > "backup_pre_standardization_$timestamp.sql"

# Listar arquivo criado
dir backup_pre_standardization_*.sql

# Exemplo esperado:
# 2026-04-21_14-30-45  5.2 MB  backup_pre_standardization_20260421_143045.sql
```

### Verificar Backup

```bash
# Verificar tamanho (deve ser > 1MB)
ls -lh backup_pre_standardization_*.sql

# Verificar conteúdo (primeiras linhas)
head -20 backup_pre_standardization_*.sql | grep "CREATE TABLE"

# Esperado: CREATE TABLE `configuracoes` ...
```

---

## FASE 2: PRÉ-VALIDAÇÃO (5 minutos)

### Executar Script de Validação Pré-Execução

```bash
# Navegar para diretório do projeto
cd d:\Programacao\oficina-mecanica

# Executar validação
php scripts/pre-validate-standardization.php
```

### Resultado Esperado

```
╔════════════════════════════════════════════════════════════════╗
║  VALIDAÇÃO PRÉ-PADRONIZAÇÃO: snake_case → camelCase          ║
╚════════════════════════════════════════════════════════════════╝

✅ VALIDAÇÕES APROVADAS:
─────────────────────────
✅ MySQL conectado: Versão 8.0.36-0ubuntu0.22.04.1
✅ Total de tabelas: 21 (esperado: >= 20)
✅ Colunas a converter: 231 em 21 tabelas
✅ Foreign Key Checks: ATIVADO
✅ Total de Foreign Keys: 25
✅ Índices secundários encontrados: 45
✅ IDs como VARCHAR(50): 85 colunas
✅ Colunas de valor com DECIMAL: 12
✅ Colunas DATETIME: 32

✅ VALIDAÇÕES APROVADAS:
─────────────────────────
STATUS: ✅ PRONTO PARA PADRONIZAÇÃO

Próximas etapas:
1. Criar backup: mysqldump -u root -p hirata_cars > ...
2. Executar script:
   mysql -u root -p hirata_cars < scripts/standardize-camelcase.sql
3. Validar resultado:
   php scripts/post-validate-standardization.php
```

### Se Houver Erros

```bash
# ❌ Não prosseguir com padronização!
# Investigar erro específico
# Exemplo:
#   ❌ Conexão com banco de dados falhou
#   → Iniciar MySQL: systemctl start mysql
#   → Ou verificar credenciais em .env
```

---

## FASE 3: EXECUÇÃO PRINCIPAL (20-30 minutos)

### Executar Script de Padronização

```bash
# Opção A: Via CLI MySQL (recomendado)
cd d:\Programacao\oficina-mecanica

mysql -u root -p hirata_cars < scripts/standardize-camelcase.sql

# Será solicitado: Enter password: [digitar senha]

# Aguardar conclusão...
# Tempo estimado: 20-30 minutos (varia com tamanho do banco)
```

### Monitorar Execução

```bash
# Em outro terminal, monitorar processamento
mysql -u root -p hirata_cars -e "SHOW PROCESSLIST;"

# Esperado (durante a execução):
# - Vários ALTERs rodando
# - ForeignKeyChecks = 0
```

### Verificar Progresso (Terminal 2)

```bash
# Enquanto script roda, verificar colunas já convertidas
mysql -u root -p hirata_cars -e "
  SELECT TABLE_NAME, COUNT(*) as underscores
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'hirata_cars'
  AND COLUMN_NAME LIKE '%\_%'
  GROUP BY TABLE_NAME
  ORDER BY underscores DESC;
"

# Esperado:
# Começar com 231, reduzir para 0 conforme script roda
```

### Ao Concluir a Execução

```bash
# Esperado no terminal:
# Query OK, 0 rows affected (X min X.XXX sec)
# [várias linhas similar]
# Query OK, 0 rows affected, 1 warning (0.001 sec)

# Se houver erro:
# ERROR 1064 (42000) at line XXX: ...
# → PARAR AQUI, fazer rollback (ver Fase 5)
```

---

## FASE 4: PÓS-VALIDAÇÃO (5 minutos)

### Executar Script de Validação Pós-Execução

```bash
# Após script principal concluir
php scripts/post-validate-standardization.php
```

### Resultado Esperado (Sucesso)

```
╔════════════════════════════════════════════════════════════════╗
║  PÓS-VALIDAÇÃO: Verificação de Padronização camelCase        ║
╚════════════════════════════════════════════════════════════════╝

✅ Nenhuma coluna com underscore encontrada!

✅ clientes: Todas as 8 colunas convertidas
✅ veiculos: Todas as 5 colunas convertidas
✅ ordens_servico: Todas as 15 colunas convertidas
✅ vendas: Todas as 17 colunas convertidas
...

✅ Foreign Keys validadas: 15/15
✅ Total de índices secundários: 45
✅ Nenhum índice com underscore encontrado
✅ Colunas DECIMAL(15,2): 12 de 12
✅ IDs como VARCHAR(50): 85
✅ Colunas createdAt/updatedAt como DATETIME: 32
✅ Integridade de dados preservada
✅ Restrições UNIQUE: 8

STATUS: ✅ PADRONIZAÇÃO CONCLUÍDA COM SUCESSO
```

### Resultado Esperado (Com Avisos)

```
⚠️  AVISOS:
──────────
⚠️  fk_vendas_carros_clienteId não encontrada (pode ter sido renomeada)
⚠️  Ainda existem 2 colunas com underscores em tabelas auxiliares

❌ ERROS ENCONTRADOS:
────────────────────
[Nenhum erro crítico - pode prosseguir com cautela]

STATUS: ✅ PADRONIZAÇÃO CONCLUÍDA COM SUCESSO
(Com avisos menores - revise antes de atualizar app)
```

### Se Houver Erros Críticos

```bash
# ❌ Parar aqui
# Fazer rollback IMEDIATAMENTE (ver Fase 5)
```

---

## FASE 5: ROLLBACK (Se Necessário)

### Se Algo Der Errado

```bash
# Restaurar do backup criado na Fase 1
cd d:\Programacao\oficina-mecanica\backups

# Listar backups disponíveis
dir backup_pre_standardization_*.sql

# Restaurar (escolher o mais recente)
mysql -u root -p hirata_cars < backup_pre_standardization_20260421_143045.sql

# Aguardar conclusão (~5-10 minutos)
```

### Verificar Rollback

```bash
# Confirmar que underscores voltaram
mysql -u root -p hirata_cars -e "
  SELECT COUNT(*) as underscores
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'hirata_cars'
  AND COLUMN_NAME LIKE '%\_%';
"

# Esperado: underscores = 231 (número original)
```

---

## FASE 6: ATUALIZAR APLICAÇÃO (30 minutos)

### Atualizar backend/src/config/entities.js

**ANTES:**
```javascript
// backend/src/config/entities.js
const entities = {
  clientes: {
    aliasTable: 'clientes',
    fields: {
      cnhNumber: 'cnh_number',           // ← Mapeava para snake_case
      passaporteNumber: 'passaporte_number',
      zairyuCardNumber: 'zairyu_card_number',
      myNumber: 'my_number',
      preferredLanguage: 'preferred_language',
      observacoesGerais: 'observacoes_gerais',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  // ... outros mappings
};
```

**DEPOIS:**
```javascript
// backend/src/config/entities.js
const entities = {
  clientes: {
    aliasTable: 'clientes',
    fields: {
      cnhNumber: 'cnhNumber',           // ← Agora usa camelCase direto
      passaporteNumber: 'passaporteNumber',
      zairyuCardNumber: 'zairyuCardNumber',
      myNumber: 'myNumber',
      preferredLanguage: 'preferredLanguage',
      observacoesGerais: 'observacoesGerais',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  },
  // ... outros mappings
};
```

### Atualizar scripts/migrate_data.php

**ANTES:**
```php
// scripts/migrate_data.php
private $fieldMappings = [
    'clientes' => [
        'cnhNumber' => 'cnh_number',
        'passaporteNumber' => 'passaporte_number',
        // ...
    ]
];
```

**DEPOIS:**
```php
// scripts/migrate_data.php
private $fieldMappings = [
    'clientes' => [
        'cnhNumber' => 'cnhNumber',
        'passaporteNumber' => 'passaporteNumber',
        // ...
    ]
];
```

### Testar Alterações

```bash
# 1. Validar sintaxe PHP
php -l backend/src/config/entities.js
php -l scripts/migrate_data.php

# Esperado: No syntax errors detected

# 2. Iniciar backend
cd backend && npm start

# Esperado: 
# Server listening on port 3001
# Database connected

# 3. Testar endpoint de teste
curl http://localhost:3001/api/clientes

# Esperado: {"status":"ok","data":[...]}
```

---

## FASE 7: REINICIAR APLICAÇÃO (10 minutos)

### Iniciar Serviços

```bash
# Terminal 1: Backend
cd d:\Programacao\oficina-mecanica\backend
npm start

# Esperado:
# Server listening on port 3001
# Connected to MySQL

# Terminal 2: Frontend
cd d:\Programacao\oficina-mecanica
npm run dev

# Esperado:
# VITE v5.x.x ready in XXX ms
# Local: http://localhost:5173
```

### Acessar Aplicação

```bash
# Abrir navegador
# URL: http://localhost:5173

# Login com credenciais
# Email: admin@email.com
# Senha: [sua senha]

# Esperado: Dashboard carrega, sem erros console
```

---

## FASE 8: TESTES FUNCIONAIS (20 minutos)

### Teste 1: Listar Clientes

```bash
# Via curl
curl -s http://localhost:3001/api/clientes | jq '.data[] | {id, nome, email}'

# Esperado:
# {
#   "id": "1",
#   "nome": "João Silva",
#   "email": "joao.silva@email.com"
# }
```

### Teste 2: Criar Novo Cliente

```bash
curl -X POST http://localhost:3001/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test Client",
    "email": "test@example.com",
    "telefone": "(11) 9999-9999",
    "endereco": "Test Street, 123"
  }' | jq '.'

# Esperado: {"status":"ok","data":{"id":"cli-xxx"}}
```

### Teste 3: Listar Veículos (com FK)

```bash
curl -s http://localhost:3001/api/veiculos | jq '.data[] | {id, clienteId, marca, modelo}'

# Esperado:
# {
#   "id": "2",
#   "clienteId": "1",
#   "marca": "Honda",
#   "modelo": "Civic"
# }
```

### Teste 4: Listar Ordens de Serviço

```bash
curl -s http://localhost:3001/api/ordensServico | jq '.data[] | {id, veiculoId, valorTotal}'

# Esperado:
# {
#   "id": "1",
#   "veiculoId": "2",
#   "valorTotal": 500.00
# }
```

### Teste 5: Gerar Contrato (Crítico)

```bash
curl -X POST http://localhost:3001/api/contratos/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "1",
    "veiculoId": "2",
    "idioma": "pt",
    "pdfBase64": "JVBERi1..."
  }' | jq '.'

# Esperado: {"status":"ok","data":{"contractId":"xxx"}}
```

### Teste 6: Interface Web

Abrir http://localhost:5173 e:

1. ✅ Fazer login
2. ✅ Acessar Dashboard
3. ✅ Listar Clientes
4. ✅ Listar Veículos
5. ✅ Listar Ordens de Serviço
6. ✅ Criar Nova OS
7. ✅ Gerar Contrato
8. ✅ Verificar Financial

---

## FASE 9: VALIDAÇÃO FINAL (5 minutos)

### Checklist Completo

- [ ] ✅ Backup criado e verificado
- [ ] ✅ Pré-validação passou (231 → 0 underscores)
- [ ] ✅ Script principal executado sem erros
- [ ] ✅ Pós-validação passou
- [ ] ✅ entities.js atualizado
- [ ] ✅ migrate_data.php atualizado
- [ ] ✅ Backend iniciado com sucesso
- [ ] ✅ Frontend iniciado com sucesso
- [ ] ✅ Login funciona
- [ ] ✅ Endpoints /api/clientes retornam dados
- [ ] ✅ Foreign keys funcionam
- [ ] ✅ Criação de novos registros funciona
- [ ] ✅ PDF generation funciona
- [ ] ✅ Sem erros no console do navegador
- [ ] ✅ Sem erros no console do backend

---

## TROUBLESHOOTING

### Problema: "ERROR 1064" Durante Execução

```
ERROR 1064 (42000) at line XXX: You have an error in your SQL syntax
```

**Solução:**
1. Parar script (Ctrl+C)
2. Restaurar backup (Fase 5)
3. Verificar linha XX no script
4. Reportar erro

### Problema: Foreign Key Violation

```
ERROR 1452: Cannot add or update a child row
```

**Solução:**
1. Script já lida com isso via `SET FOREIGN_KEY_CHECKS = 0`
2. Se ainda assim ocorrer, fazer rollback

### Problema: Aplicação não conecta ao banco

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solução:**
1. Verificar se MySQL está rodando: `systemctl status mysql`
2. Verificar credenciais em `backend/.env`
3. Executar: `mysql -u root -p -e "SELECT 1;"`

### Problema: Colunas ainda têm underscores

```
SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS ... = 15
```

**Solução:**
1. Rodar novamente `scripts/post-validate-standardization.php`
2. Identificar tabelas afetadas
3. Executar ALTERs manuais para colunas restantes
4. Contactar DBA

### Problema: Índices com nomes errados

```
⚠️  idx_clientes_cnh_number não encontrado
```

**Solução:**
1. Índices podem ter nomes genéricos
2. Verificar: `SHOW INDEXES FROM clientes;`
3. Se funciona, ignorar aviso

---

## ESTIMATIVA DE TEMPO TOTAL

| Fase | Duração | Descrição |
|------|---------|-----------|
| **0. Pré-requisitos** | 15 min | Verificar ambiente, parar app |
| **1. Backup** | 10 min | Criar dump completo |
| **2. Pré-validação** | 5 min | Rodar validação pré-execução |
| **3. Execução** | 20-30 min | Script SQL principal |
| **4. Pós-validação** | 5 min | Rodar validação pós-execução |
| **5. Rollback** | *Se necessário* | 10-15 min |
| **6. Atualizar App** | 30 min | Atualizar entities.js, scripts |
| **7. Reiniciar** | 10 min | Backend + Frontend |
| **8. Testes** | 20 min | Validação funcional |
| **9. Final** | 5 min | Checklist |
| **TOTAL** | **2-2.5 horas** | Sem erros (com rollback: +30min) |

---

## SUPORTE

Se encontrar problemas:

1. **Verificar logs:**
   ```bash
   # MySQL logs
   tail -100 /var/log/mysql/error.log
   
   # App logs
   pm2 logs
   ```

2. **Contactar DBA:**
   - Ter em mão: Linha exata do erro, timestamp, backup
   - Descrever: Qual fase falhou, qual foi o erro específico

3. **Recursos úteis:**
   - `docs/DATABASE-STANDARDIZATION-REPORT.md` - Análise completa
   - `scripts/standardize-camelcase.sql` - Script principal
   - `scripts/pre-validate-standardization.php` - Validação pré
   - `scripts/post-validate-standardization.php` - Validação pós

---

**Status:** ✅ Guia Completo Pronto para Execução  
**Data:** 21 de Abril de 2026  
**Versão:** 1.0
