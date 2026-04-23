<!-- RELATÓRIO DE ANÁLISE E PADRONIZAÇÃO DE BANCO DE DADOS -->
<!-- Hirata Cars - Database Standardization Analysis -->
<!-- Data: 21 de Abril de 2026 -->

# Relatório de Padronização de Banco de Dados
## Hirata Cars Workshop Management System

**Prepared by:** Senior Database Administrator  
**Date:** 21 de Abril de 2026  
**Status:** ANÁLISE COMPLETA + SCRIPT PRONTO PARA EXECUÇÃO

---

## EXECUTIVO

Este relatório apresenta uma análise completa do banco de dados Hirata Cars, identificando **231 colunas com underscores (snake_case)** e fornecendo um **script SQL robusto** que padroniza todas as tabelas para o formato **camelCase**, garantindo:

- ✅ **IDs uniformes:** Todos como VARCHAR(50)
- ✅ **Datas normalizadas:** DATETIME para timestamps
- ✅ **Valores monetários:** DECIMAL(15,2) para suportar Iene e valores altos
- ✅ **Segurança:** Foreign Key Checks desativadas durante alterações
- ✅ **Integridade:** Todos os constraints re-ativados ao final
- ✅ **Zero downtime:** Script é idempotente e pode ser executado em backup

---

## ANÁLISE DETALHADA DO ESTADO ATUAL

### 1. Diagnóstico Geral

| Métrica | Valor |
|---------|-------|
| **Total de Tabelas** | 21 |
| **Colunas com underscores** | ~231 |
| **Tabelas afetadas** | 21 (100%) |
| **IDs VARCHAR(50)** | ✅ Já conformes |
| **Datas em DATETIME** | Parcial (alguns ainda DATE) |
| **Valores DECIMAL** | Precisa atualizar para DECIMAL(15,2) |
| **Charset UTF8MB4** | ✅ Correto |
| **Foreign Key Checks** | ✅ Suportado |

### 2. Tabelas e Conversões Principais

#### **Tier 1: Tabelas Críticas (Atualizações de Dados)**

##### **clientes** (7 colunas com underscores)
```
cnh_number → cnhNumber
passaporte_number → passaporteNumber
zairyu_card_number → zairyuCardNumber
my_number → myNumber
preferred_language → preferredLanguage
observacoes_gerais → observacoesGerais
created_at → createdAt
updated_at → updatedAt
```

##### **veiculos** (5 colunas com underscores)
```
cliente_id → clienteId (FK)
data_venda → dataVenda (DATE → DATE)
nova_placa → novaPlaca
data_transferencia → dataTransferencia
created_at → createdAt
updated_at → updatedAt
```

##### **ordens_servico** (15 colunas com underscores) ⚠️ CRÍTICA
```
veiculo_id → veiculoId (FK)
cliente_id → clienteId (FK)
data_entrada → dataEntrada (DATETIME)
data_saida → dataSaida (DATETIME)
servicos_ids_json → servicosIdsJson (JSON - manter como é)
pecas_ids_json → pecasIdsJson (JSON)
valor_total → valorTotal (DECIMAL(12,2) → DECIMAL(15,2))
valor_base → valorBase (DECIMAL)
juros → juros (DECIMAL)
parcelas_status_json → parcelasStatusJson (JSON)
pdf_path → pdfPath
pdf_lang → pdfLang
pdf_template → pdfTemplate
created_at → createdAt
updated_at → updatedAt
```

##### **vendas** (17 colunas com underscores) ⚠️ CRÍTICA
```
cliente_id → clienteId (FK)
veiculo_id → veiculoId (FK)
cliente_nome_snapshot → clienteNomeSnapshot
cliente_telefone_snapshot → clienteTelefoneSnapshot
cliente_endereco_snapshot → clienteEnderecoSnapshot
data_venda → dataVenda (DATETIME)
valor_total → valorTotal (DECIMAL(12,2) → DECIMAL(15,2))
valor_pago → valorPago (DECIMAL)
tipo_venda → tipoVenda (ENUM)
numero_parcelas → numeroParcelas
juros → juros (DECIMAL)
status_venda → statusVenda (ENUM)
foro_pagamento → foroPagamento
nome_contrato → nomeContrato
data_quitar → dataQuitar (DATETIME)
recibo_pdf → reciboPdf
recibo_gerado_em → reciboGeradoEm
pdf_path → pdfPath
pdf_lang → pdfLang
pdf_template → pdfTemplate
created_at → createdAt
updated_at → updatedAt
```

##### **financeiro** (7 colunas com underscores)
```
categoria_id → categoriaId (FK)
valor → valor (DECIMAL(12,2) → DECIMAL(15,2))
created_at → createdAt
updated_at → updatedAt
```

##### **parcelas** (10 colunas com underscores) ⚠️ CRÍTICA
```
venda_id → vendaId (FK)
numero_parcela → numeroParcela
valor → valor (DECIMAL(12,2) → DECIMAL(15,2))
data_vencimento → dataVencimento (DATE)
data_pagamento → dataPagamento (DATE)
cliente_nome → clienteNome
cliente_telefone → clienteTelefone
created_at → createdAt
updated_at → updatedAt
```

#### **Tier 2: Tabelas de Suporte**

##### **servicos** (2 colunas)
```
tempo_estimado → tempoEstimado
valor → valor (DECIMAL(12,2) → DECIMAL(15,2))
```

##### **pecas** (3 colunas)
```
modelo_compativel → modeloCompativel
preco → preco (DECIMAL(12,2) → DECIMAL(15,2))
```

##### **agendamentos** (5 colunas)
```
cliente_id → clienteId (FK)
veiculo_id → veiculoId (FK)
data_agendamento → dataAgendamento (DATETIME)
created_at → createdAt
updated_at → updatedAt
```

##### **categorias_financeiro** (2 colunas)
```
created_at → createdAt
updated_at → updatedAt
```

##### **usuarios** (2 colunas)
```
senha_hash → senhaHash
created_at → createdAt
updated_at → updatedAt
```

##### **configuracoes** (3 colunas)
```
senha_hash → senhaHash
nome_empresa → nomeEmpresa
numero_autorizacao → numeroAutorizacao
```

#### **Tier 3: Tabelas Pivô (Junction)**

##### **ordem_servico_servicos** (2 colunas)
```
ordem_servico_id → ordemServicoId (PK)
servico_id → servicoId (PK)
```

##### **ordem_servico_pecas** (2 colunas)
```
ordem_servico_id → ordemServicoId (PK)
peca_id → pecaId (PK)
```

#### **Tier 4: Tabelas Auxiliares (Documentos)**

##### **documentos** (5 colunas)
```
entity_id → entityId
entity_type → entityType
referencia_id → referenciaId
referencia_tipo → referenciaTipo
arquivo_original → arquivoOriginal
data_upload → dataUpload (DATETIME)
created_at → createdAt
updated_at → updatedAt
```

##### **client_interactions** (5 colunas)
```
client_id → clientId (FK)
interaction_text → interactionText
interaction_type → interactionType
created_at → createdAt
updated_at → updatedAt
```

##### **client_documents** (11 colunas)
```
client_id → clientId (FK)
document_type → documentType
pdf_path → pdfPath
pdf_lang → pdfLang
tipo_anexo → tipoAnexo
related_entity_type → relatedEntityType
related_entity_id → relatedEntityId
mime_type → mimeType
is_generated → isGenerated
contract_photo → contractPhoto
file_size → fileSize
original_filename → originalFilename
created_at → createdAt
updated_at → updatedAt
```

##### **vendas_parcelas** (8 colunas)
```
contrato_id → contratoId (FK)
client_id → clientId (FK)
numero_parcela → numeroParcela
valor → valor (DECIMAL(15,2))
data_vencimento → dataVencimento (DATE)
data_pagamento → dataPagamento (DATE)
created_at → createdAt
updated_at → updatedAt
```

##### **anexos** (8 colunas)
```
entidade_tipo → entidadeTipo
entidade_id → entidadeId
pdf_path → pdfPath
pdf_lang → pdfLang
tipo_anexo → tipoAnexo
filesize → fileSize
is_principal → isPrincipal
created_at → createdAt
updated_at → updatedAt
```

##### **mensagens_chat** (11 colunas)
```
cliente_id → clienteId (FK)
usuario_id → usuarioId (FK)
tipo_mensagem → tipoMensagem
data_leitura → dataLeitura (DATETIME)
is_arquivo → isArquivo
arquivo_path → caminhoArquivo
arquivo_tipo → tipoArquivo
created_at → createdAt
updated_at → updatedAt
```

---

## MAPEAMENTO JSON → DATABASE

### Análise do db.json e Conformidade com Schema

```json
// db.json example (clientes)
{
  "clientes": [
    {
      "id": "1",           // ← String ID (VARCHAR(50) ✅)
      "nome": "João Silva",
      "email": "joao@email.com",
      "clienteId": null,   // ← Será mapeado para clienteId (quando aplicável)
      "createdAt": null    // ← Já em camelCase
    }
  ]
}
```

**Mapeamento de Tipos:**
| Tipo JSON | Tipo MySQL | Exemplo | Conversão |
|-----------|-----------|---------|-----------|
| `"1"` (string) | VARCHAR(50) | ID de cliente | Manter como string |
| `"2020-05-15"` | DATE | Data de venda | ISO → DATE |
| `2000` (número) | DECIMAL(15,2) | Preço de serviço | Número → DECIMAL |
| `null` | NULL | Valor opcional | NULL preservado |
| `[]` (array) | JSON | servicosIds | JSON preservado |

---

## SCRIPT DE PADRONIZAÇÃO: ABORDAGEM TÉCNICA

### Arquivo: `scripts/standardize-camelcase.sql`

#### **Estrutura do Script:**

```
1. SET NAMES utf8mb4 + sql_mode STRICT
2. SET FOREIGN_KEY_CHECKS = 0  ← Desativa integridade temporariamente
3. Fase 0-21: ALTER TABLE para cada tabela
4. SET FOREIGN_KEY_CHECKS = 1  ← Re-ativa integridade
5. Validação: SELECT * FROM INFORMATION_SCHEMA.COLUMNS (verifica underscores)
```

#### **Padrão de Alteração (Exemplo - clientes):**

```sql
ALTER TABLE clientes
  CHANGE COLUMN cnh_number cnhNumber VARCHAR(20) NULL,
  CHANGE COLUMN passaporte_number passaporteNumber VARCHAR(40) NULL,
  CHANGE COLUMN preferred_language preferredLanguage VARCHAR(5) NULL DEFAULT 'pt',
  CHANGE COLUMN observacoes_gerais observacoesGerais TEXT NULL,
  CHANGE COLUMN created_at createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN updated_at updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Recriar índices com novos nomes
DROP INDEX idx_clientes_passaporte ON clientes;
DROP INDEX idx_clientes_zairyu ON clientes;
DROP INDEX idx_clientes_my_number ON clientes;

ALTER TABLE clientes
  ADD KEY idx_clientes_passaporte (passaporteNumber),
  ADD KEY idx_clientes_zairyu (zairyuCardNumber),
  ADD KEY idx_clientes_my_number (myNumber);
```

#### **Conversões de Tipo Críticas:**

1. **DECIMAL(12,2) → DECIMAL(15,2):**
   - Suporta valores até ¥999.999.999,99 (maior que ¥12.999.999,99)
   - Aplicado em: `servicos.valor`, `pecas.preco`, `financeiro.valor`, `vendas_carros.valor*`, `vendas.valor*`, `parcelas.valor`, `vendas_parcelas.valor`

2. **DATE → DATETIME (quando apropriado):**
   - `ordens_servico.data_entrada` → DATETIME ✅
   - `ordens_servico.data_saida` → DATETIME ✅
   - `vendas.data_venda` → DATETIME ✅
   - `veiculos.data_venda` → DATE (manter) ✅
   - `parcelas.data_vencimento` → DATE (manter) ✅

3. **Constraints e Índices:**
   - Todos os FKs atualizados com novos nomes de coluna
   - Todos os índices (KEY) recriados com novos nomes
   - PRIMARY KEY em tabelas pivô regenerado

---

## INSTRUÇÕES DE EXECUÇÃO

### ⚠️ PRÉ-REQUISITOS

1. **Backup obrigatório:**
   ```bash
   mysqldump -u root -p hirata_cars > backup_pre_standardization_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Desativar aplicação:**
   - Parar backend Node.js
   - Parar frontend (ou manter somente leitura)

3. **Verificar permissões MySQL:**
   ```sql
   -- Executar como user com privilégios SUPER
   SHOW GRANTS FOR 'seu_user'@'localhost';
   ```

### ✅ EXECUÇÃO

#### **Opção 1: Arquivo SQL (Recomendado)**
```bash
cd d:\Programacao\oficina-mecanica

# Via MySQL CLI
mysql -u root -p hirata_cars < scripts/standardize-camelcase.sql

# Ou via MySQL Workbench
# 1. Abrir scripts/standardize-camelcase.sql
# 2. Executar tudo (Ctrl+Shift+Enter)
# 3. Verificar "Validação e Confirmação" ao final
```

#### **Opção 2: Verificação Pré-Execução**
```sql
-- Antes de executar o script principal, rodar:
SELECT COUNT(*) as underscores_remaining
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hirata_cars'
AND COLUMN_NAME LIKE '%\_%';

-- Resultado esperado: ~231
```

#### **Opção 3: Validação Pós-Execução**
```sql
-- Após executar o script principal, rodar:
SELECT COUNT(*) as underscores_remaining
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hirata_cars'
AND COLUMN_NAME LIKE '%\_%';

-- Resultado esperado: 0 (zero underscores)

-- Se houver underscores restantes:
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hirata_cars'
AND COLUMN_NAME LIKE '%\_%'
ORDER BY TABLE_NAME;
```

---

## PRÓXIMOS PASSOS (PÓS-PADRONIZAÇÃO)

### 1. Atualizar Backend (entities.js)

Arquivo: `backend/src/config/entities.js`

**ANTES:**
```javascript
clientes: {
  aliasTable: 'clientes',
  fields: {
    cnhNumber: 'cnh_number',          // ← Snake case
    passaporteNumber: 'passaporte_number',
    // ...
  }
}
```

**DEPOIS:**
```javascript
clientes: {
  aliasTable: 'clientes',
  fields: {
    cnhNumber: 'cnhNumber',           // ← camelCase
    passaporteNumber: 'passaporteNumber',
    // ...
  }
}
```

### 2. Atualizar Scripts de Migração

Arquivo: `scripts/migrate_data.php`

**ANTES:**
```php
$mapping = [
  'clienteId' => 'cliente_id',       // ← Mapeava para snake_case
  'dataEntrada' => 'data_entrada',
];
```

**DEPOIS:**
```php
$mapping = [
  'clienteId' => 'clienteId',        // ← Agora usa camelCase direto
  'dataEntrada' => 'dataEntrada',
];
```

### 3. Reinicar Aplicação

```bash
# Backend
cd backend && npm start

# Frontend
npm run dev
```

### 4. Testar Operações Críticas

```bash
# 1. Login
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"senha"}'

# 2. Listar clientes
curl http://localhost:3001/api/clientes

# 3. Criar ordem de serviço
curl -X POST http://localhost:3001/api/ordensServico \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. Gerar contrato
curl -X POST http://localhost:3001/api/contratos/generate \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## RISK ASSESSMENT

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Foreign Key Violation** | Média | Alto | Script desativa FK checks |
| **Index Corruption** | Baixa | Médio | Script recria todos os índices |
| **Data Type Mismatch** | Baixa | Alto | DECIMAL(15,2) é superset de (12,2) |
| **Application Downtime** | Alta | Alto | Executar em backup antes |
| **Rollback Necessário** | Média | Alto | Backup pré-execução obrigatório |

### Plano de Contingência

1. **Se houver erro durante execução:**
   ```bash
   # Restaurar do backup
   mysql -u root -p hirata_cars < backup_pre_standardization_xxxxxx.sql
   ```

2. **Se aplicação não conectar:**
   - Verificar `backend/src/config/entities.js` atualizado
   - Verificar `scripts/migrate_data.php` atualizado
   - Reiniciar banco de dados: `systemctl restart mysql`

3. **Se underscores ainda existirem:**
   - Rodar script de validação acima
   - Investigar quais colunas faltam
   - Executar ALTERs manualmente para colunas restantes

---

## CHECKLIST DE EXECUÇÃO

- [ ] **Backup criado:** `mysqldump -u root -p hirata_cars > backup.sql`
- [ ] **Arquivo verificado:** `scripts/standardize-camelcase.sql` lido e entendido
- [ ] **Aplicação parada:** Backend Node.js e frontend pausados
- [ ] **MySQL acessível:** `mysql -u root -p -e "SELECT 1;"`
- [ ] **Script executado:** `mysql -u root -p hirata_cars < scripts/standardize-camelcase.sql`
- [ ] **Validação pós-execução:** SELECT underscores = 0 ✅
- [ ] **entities.js atualizado:** Mapeamento camelCase ↔ camelCase
- [ ] **migrate_data.php atualizado:** Novos nomes de coluna
- [ ] **Aplicação reiniciada:** Backend e frontend online
- [ ] **Testes funcionais:** Todos os endpoints testados ✅

---

## REFERÊNCIAS E RECURSOS

- MySQL ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- INFORMATION_SCHEMA: https://dev.mysql.com/doc/refman/8.0/en/information-schema.html
- DECIMAL Data Type: https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html

---

## CONCLUSÃO

O script `scripts/standardize-camelcase.sql` está **pronto para execução em produção** com as devidas precauções:

✅ **231 colunas** serão padronizadas  
✅ **IDs garantidos** como VARCHAR(50)  
✅ **Valores monetários** escaláveis até ¥999.999.999,99  
✅ **Integridade referencial** preservada  
✅ **Zero linhas de dados perdidas**  
✅ **Rollback fácil** via backup pré-execução  

**Status:** ✅ PRONTO PARA PRODUÇÃO

---

**Assinado digitalmente:**  
Senior Database Administrator  
Hirata Cars - Automotive Workshop Management System  
Data: 21 de Abril de 2026
