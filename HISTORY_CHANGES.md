# HISTORY OF CHANGES — Hirata Cars System

> Registro cronológico de alterações realizadas e planejadas para este projeto.

---

## [v2.6.0] — 2026-04-24 — Conformidade Estrita SRE (Restauração Final)

### ✅ Alterações Realizadas (Escopo Controlado)

#### deploy.sh (Servidor Linux)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `deploy.sh` | MODIFICADO | Sequência consolidada para `/var/www/hiratacars.jp` com proteção de `.env` em `/tmp/.env.bak`, sincronização (`fetch/reset`), restauração com `chmod 600`, build (`npm install` backend + raiz + `npm run build`), criação de `backend/uploads/contracts`, `chmod -R 775 backend/uploads`, `chmod +x deploy.sh`, e restart persistente `pm2 restart hirata-backend && pm2 save`. |

#### Segurança API (Zero Trust)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/server.js` | MODIFICADO | `requireAuth` endurecido para exigir sessão em toda rota `/api/` sem bypass de método (incluindo GET); sem sessão retorna `401`. |

#### Módulo de Contratos (Validação)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/pages/Contratos.tsx` | VALIDADO | Seleção múltipla mantida para `pt`, `ja`, `fil`, `vi`, `id`, `en`; tabela permanece sem IDs técnicos e com foco em Cliente, Veículo, Valor JPY e Data. |
| `backend/src/routes/contracts.js` | VALIDADO | Geração de PDF único multilíngue mantida com nome `NomeDoCliente_Data.pdf`. |

#### Faxina Técnica (Status Final)

| Item | Status |
|---|---|
| `DashboardEntrega.tsx` | REMOVIDO |
| `install-backend.sh` | REMOVIDO |
| `DASHBOARD-ENTREGA.html` | REMOVIDO |
| `backend2/` | REMOVIDO |

---

## [v2.5.0] — 2026-04-24 — Restauração SRE: Deploy Escudo, Zero Trust e Contratos

### ✅ Alterações Realizadas (Escopo Restrito)

#### Infraestrutura e Deploy

| Arquivo | Tipo | Descrição |
|---|---|---|
| `deploy.sh` | MODIFICADO | Ajustado para ambiente real em `/var/www/hiratacars.jp` com sequência SRE estrita: backup de `backend/.env` em `/tmp/.env.bak` → `git fetch/reset` → restauração do `.env` com `chmod 600` → `npm install` backend/frontend + `npm run build` → criação de `backend/uploads/contracts` + `chmod -R 775 backend/uploads` → `pm2 restart hirata-backend` + `pm2 save`. |
| `deploy.bat` | MANTIDO (VALIDADO) | Fluxo local preservado conforme política: validação com `npm run build` antes do envio, seguido de `git add -A`, `git commit` e `git push origin master --force`. |

#### Segurança de API (Zero Trust)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/server.js` | MODIFICADO | `requireAuth` endurecido para proteger todas as rotas sob `/api/` sem bypass por método GET; ausência de sessão retorna `401`. |

#### Módulo de Contratos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/pages/Contratos.tsx` | MODIFICADO | Seleção múltipla mantida com os 6 idiomas (`pt`, `ja`, `fil`, `vi`, `id`, `en`); tabela simplificada para exibir apenas Cliente, Veículo, Valor (JPY) e Data; IDs técnicos permanecem ocultos. |
| `backend/src/routes/contracts.js` | VALIDADO | Mantida geração de PDF único com múltiplos idiomas selecionados e convenção de nome `NomeDoCliente_Data.pdf`. |

#### Faxina Técnica (Status)

| Item | Status |
|---|---|
| `install-backend.sh` | REMOVIDO |
| `src/pages/DashboardEntrega.tsx` | REMOVIDO |
| `backend2/` | REMOVIDO |
| `DASHBOARD-ENTREGA.html` | REMOVIDO |
| rastros de banco JSON em runtime | REMOVIDOS |

---

## [v2.4.0] — 2026-04-24 — Intervenção Arquitetural: Segurança, Contratos e Infraestrutura

### ✅ Alterações Realizadas

#### Segurança Zero Trust

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/server.js` | MODIFICADO | `requireAuth` agora protege explicitamente todas as rotas sob `/api/`, liberando apenas `login`, `setup`, `auth/status` e `health`. |
| `backend/src/routes/contracts.js` | MODIFICADO | Visualização e download de contratos continuam restritos às rotas autenticadas do backend; nenhum PDF é exposto por rota estática. |

#### Contratos Multilíngues

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/src/services/contractPdf.js` | MODIFICADO | Templates adicionados para `fil`, `vi`, `id` e `en`; geração server-side agora suporta múltiplos idiomas no mesmo PDF. |
| `backend/src/routes/contracts.js` | MODIFICADO | Novo payload com `idiomas[]`; padrão automático `pt + ja`; nome de arquivo agora segue `NomeDoCliente_Data.pdf`. |
| `src/pages/Contratos.tsx` | MODIFICADO | IDs técnicos removidos da tabela; seletor múltiplo com PT, JP, Tagalo, Vietnamita, Indonésio e Inglês. |
| `src/pages/VendasCarros.tsx` | MODIFICADO | Fluxo de criação de venda atualizado para gerar contratos com seleção múltipla de idiomas e padrão bilíngue PT+JP. |

#### Limpeza de Infraestrutura

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/pages/DashboardEntrega.tsx` | REMOVIDO | Arquivo legado removido fisicamente do repositório. |
| `backend/src/scripts/import-json.js` | REMOVIDO | Importador do banco JSON eliminado após migração total para MySQL. |
| `backend/package.json` | MODIFICADO | Script `import:json` removido. |
| `deploy.sh` | MODIFICADO | Script de servidor mantido apenas como atualização segura: `fetch/reset`, `npm install`, `build`, `pm2 restart`, `pm2 save`. |

---

## [v2.3.0] — 2026-04-24 — Limpeza de Dependências e Infraestrutura

### ✅ Alterações Realizadas

#### Remoção de Arquivos Obsoletos

| Arquivo/Pasta | Motivo da Remoção |
|---|---|
| `backend2/` | Código legado, completamente substituído por `backend/` |
| `arquivos de banco legado em JSON` | Estruturas estáticas removidas após migração total para MySQL |
| `DASHBOARD-ENTREGA.html` | HTML avulso da versão antiga — substituído por `Contratos.tsx` |
| `index-BgX3LbdG.js}` | Artefato de build corrompido (nome malformado) |
| `FETCH_HEAD` | Arquivo Git colocado incorretamente na raiz do projeto |
| `scripts/` | Pasta de scripts vazia |

#### Dependência Removida (Frontend)

| Pacote | Motivo |
|---|---|
| `@react-pdf/renderer` | Nenhum import em todo o `src/`. 56 pacotes transitivos removidos. |

#### Scripts de Deploy Reescritos

| Arquivo | Antes | Depois |
|---|---|---|
| `deploy.sh` | Gerava tar.gz local (obsoleto) | Deploy real no servidor: `git fetch --all` → `git reset --hard origin/master` → `npm install` → `npm run build` → `pm2 restart hirata-backend` |
| `deploy.bat` | Só rodava `npm run build` | Fluxo completo local: `git add -A` → `git commit` → `git push origin master --force` |

#### .gitignore Expandido

Adicionadas entradas: `dist/`, `.env*`, `logs/`, `backend/storage/`, `public/uploads/`, `*.zip`, `*.sql`, `*.bak`, `db*.json`, `.vscode/settings.json`, `.claude/`

---

## [v2.2.0] — 2026-04-24 — Módulo de Contratos

### ✅ Alterações Realizadas

#### Frontend

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/pages/Contratos.tsx` | **NOVO** | Página funcional de gestão de contratos. Substituiu `DashboardEntrega.tsx`. Inclui seletor de idioma (PT/JA/EN), formatação JPY, tabs Pendentes/Gerados, botões Gerar/Ver/Download. |
| `src/pages/DashboardEntrega.tsx` | DEPRECIADO | Arquivo mantido temporariamente. Funcionalidade migrada para `Contratos.tsx`. |
| `src/App.tsx` | MODIFICADO | Substituído import `DashboardEntrega` por `Contratos`. Rota alterada de `/dashboard-entrega` para `/contratos`. |
| `src/components/Navbar.tsx` | MODIFICADO | Item de menu `dashboardEntrega` renomeado para `contratos`, rota `/contratos`, ícone trocado de `LocalShippingIcon` para `ArticleIcon`. |
| `src/utils/i18n.ts` | MODIFICADO | Chave `dashboardEntrega` renomeada para `contratos` nos 4 idiomas (pt/fil/vi/ja). Traduções: PT=Contratos, FIL=Mga Kontrata, VI=Hợp đồng, JA=契約書. |

#### Backend

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/src/services/contractPdf.js` | MODIFICADO | Adicionado template em **Inglês** (`en`). Moeda alterada de BRL para **JPY** (`ja-JP / Intl.NumberFormat`). |
| `backend/src/routes/contracts.js` | MODIFICADO | Validação de idioma ampliada para aceitar `'en'` além de `'pt'` e `'ja'`. |

#### Segurança

- `requireAuth` aplicado **globalmente** via `app.use(requireAuth)` em `server.js` (linha 550).
- Todas as rotas `/api/vendas_carros/*` e `/api/*` exigem sessão ativa.
- Somente `OPTIONS` e paths explícitos em `AUTH_PUBLIC_PATHS` são públicos.

---

## [v2.1.0] — 2026-03-24 — Contratos PDF Server-Side + CRM + Segurança

### ✅ Alterações Realizadas

| Arquivo | Tipo | Descrição |
|---|---|---|
| `backend/src/services/contractPdf.js` | **NOVO** | Geração server-side de PDF com `pdfkit`. Templates PT e JA. |
| `backend/src/routes/contracts.js` | MODIFICADO | 5 novas rotas: `pending-delivery`, `contracts/generated`, `contracts/generate`, `contracts/view`, `contracts/download`. |
| `backend/server.js` | MODIFICADO | Removido bypass GET no `requireAuth` (Zero Trust). |
| `src/pages/DashboardEntrega.tsx` | **NOVO** (na época) | Dashboard de entrega com tabs pendentes/gerados. |
| `src/pages/VendasCarros.tsx` | MODIFICADO | Seletor de idioma (pt/ja), botões Visualizar e Download de contrato por linha. |
| `src/App.tsx` | MODIFICADO | Rota `/dashboard-entrega` adicionada. |
| `src/components/Navbar.tsx` | MODIFICADO | Item `dashboardEntrega` adicionado ao menu. |
| `src/utils/i18n.ts` | MODIFICADO | Chave `dashboardEntrega` adicionada nos 4 idiomas. |
| `README.md` | REESCRITO | Bilíngue (EN + PT), badges, instalação passo a passo. |
| `backend/package.json` | MODIFICADO | Dependência `pdfkit` adicionada. |

---

## 🗺️ Mudanças Futuras Planejadas

### Alta Prioridade

| ID | Descrição | Arquivos Afetados |
|---|---|---|
| FUT-001 | **DB Migration**: Adicionar colunas `contratoPath VARCHAR(500)` e `contratoGeradoEm DATETIME` na tabela `vendas_carros` | `backend/schema.sql` + script de migração |
| FUT-002 | **Regenerar contrato**: Permitir gerar novo PDF para venda que já possui contrato (sobrescrever/versionar) | `Contratos.tsx`, `contracts.js` |
| FUT-003 | **Exclusão de contrato**: Botão para apagar PDF e limpar `contratoPath` no banco | `Contratos.tsx`, `contracts.js` |
| FUT-004 | **Assinatura digital**: Integrar campo de assinatura eletrônica no PDF (via canvas ou base64) | `contractPdf.js`, `Contratos.tsx` |

### Média Prioridade

| ID | Descrição | Arquivos Afetados |
|---|---|---|
| FUT-005 | **Regeneração bilíngue inteligente**: Permitir presets por perfil do cliente (ex.: JP+EN, PT+FIL) | `contractPdf.js`, `contracts.js`, `Contratos.tsx` |
| FUT-006 | **Notificação por e-mail**: Enviar e-mail ao cliente com PDF em anexo após geração | `backend/src/services/mailer.js` (novo), `contracts.js` |
| FUT-007 | **Paginação e filtros**: Adicionar busca por cliente/veículo e paginação nas listas de contratos | `Contratos.tsx` |
| FUT-008 | **Metadados de idiomas no banco**: Persistir os idiomas gerados do contrato para exibição histórica no frontend | `backend/schema.sql`, `contracts.js`, `Contratos.tsx` |

### Baixa Prioridade / Melhorias

| ID | Descrição | Arquivos Afetados |
|---|---|---|
| FUT-009 | **Logo no PDF**: Inserir logotipo da empresa no cabeçalho do contrato PDF | `contractPdf.js` |
| FUT-010 | **Preview inline no browser**: Exibir PDF em modal dentro da aplicação (sem nova aba) | `Contratos.tsx` |
| FUT-011 | **Histórico de versões de contrato**: Manter múltiplas versões do mesmo contrato | `backend/schema.sql`, `contracts.js` |
| FUT-012 | **Git push para branch main**: Sincronizar branch `master` com `main` no repositório remoto | — |

---

## Convenções de Nomenclatura

- **NOVO** = arquivo criado do zero
- **MODIFICADO** = arquivo existente alterado
- **DEPRECIADO** = arquivo mantido apenas por compatibilidade/histórico
- Todos os valores monetários do módulo de vendas/contratos usam **JPY** (`ja-JP` locale)
- Idiomas suportados nos contratos PDF: `pt` (Português), `ja` (日本語), `fil` (Tagalo), `vi` (Vietnamita), `id` (Indonésio), `en` (English)
