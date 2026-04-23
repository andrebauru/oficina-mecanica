# Oficina Mecânica | Workshop Management System

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ENGLISH

## 1) Project Overview

Oficina Mecânica is a full-stack workshop/business management platform focused on:

- Service Orders (`ordens_servico`)
- Customers CRM (`clientes`, interactions, documents)
- Vehicles management (`veiculos`)
- Car sales management (`vendas_carros`, `vendas`, `parcelas`)
- Contract generation and downloads (PDF)
- Financial operations and reporting
- Multilingual UI (`pt`, `vi`, `fil`, `ja`)

### Architecture

- Frontend: React + TypeScript + Vite + MUI
- Backend: Node.js + Express + MySQL (`mysql2`)
- Auth: Session-based authentication (`express-session`)
- File handling: `multer`
- Contract PDF generation (backend): `pdfkit`

## 2) Repository Structure

- Root: frontend application and shared scripts
- [backend/server.js](backend/server.js): main backend entrypoint
- [backend/src/routes/contracts.js](backend/src/routes/contracts.js): contract/sales routes
- [backend/src/config/database.js](backend/src/config/database.js): MySQL pool/query layer
- [backend/src/config/env.js](backend/src/config/env.js): environment loader
- [backend/schema.sql](backend/schema.sql) and [hirata_cars.sql](hirata_cars.sql): DB schema/data

## 3) Step-by-Step Installation

### Prerequisites

1. Node.js 18+
2. npm 9+
3. MySQL 8+
4. Git

### Step 1 — Clone

```bash
git clone https://github.com/fvandrad/oficina-mecanica.git
cd oficina-mecanica
```

### Step 2 — Install Frontend Dependencies (root)

```bash
npm install
```

### Step 3 — Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 4 — Configure Backend Environment

Create `backend/.env` with your values:

```env
NODE_ENV=development
API_PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hirata_cars
SESSION_SECRET=change-this-secret
DB_CONNECT_TIMEOUT=10000
DB_QUERY_TIMEOUT=10000
```

### Step 5 — Create/Import Database

Option A (full dump):

```bash
mysql -u root -p hirata_cars < hirata_cars.sql
```

Option B (schema only):

```bash
mysql -u root -p hirata_cars < backend/schema.sql
```

### Step 6 — Start Backend

```bash
cd backend
npm run dev
```

### Step 7 — Start Frontend (new terminal)

```bash
npm run dev
```

Default local URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 4) Useful Commands

### Frontend (root)

```bash
npm run dev
npm run build
npm run lint
```

### Backend

```bash
cd backend
npm run dev
npm run start
npm run check
```

## 5) Security Notes

- Session timeout middleware is enabled.
- Protected API endpoints require active session.
- Contract files are validated and resolved with safe server-side paths.
- Input sanitization is used in frontend flows.

---

## PORTUGUÊS

## 1) Sobre o Projeto

O Oficina Mecânica é uma plataforma full-stack de gestão para oficina e vendas, com foco em:

- Ordens de Serviço (`ordens_servico`)
- CRM de clientes (`clientes`, interações, documentos)
- Gestão de veículos (`veiculos`)
- Gestão de vendas de carros (`vendas_carros`, `vendas`, `parcelas`)
- Geração e download de contratos em PDF
- Operação financeira e relatórios
- Interface multilíngue (`pt`, `vi`, `fil`, `ja`)

### Arquitetura

- Frontend: React + TypeScript + Vite + MUI
- Backend: Node.js + Express + MySQL (`mysql2`)
- Autenticação: sessão (`express-session`)
- Upload de arquivos: `multer`
- Geração de contrato PDF (backend): `pdfkit`

## 2) Estrutura do Repositório

- Raiz: app frontend e scripts gerais
- [backend/server.js](backend/server.js): ponto de entrada do backend
- [backend/src/routes/contracts.js](backend/src/routes/contracts.js): rotas de contratos/vendas
- [backend/src/config/database.js](backend/src/config/database.js): pool/query MySQL
- [backend/src/config/env.js](backend/src/config/env.js): loader de variáveis de ambiente
- [backend/schema.sql](backend/schema.sql) e [hirata_cars.sql](hirata_cars.sql): schema/dados do banco

## 3) Instalação Passo a Passo

### Pré-requisitos

1. Node.js 18+
2. npm 9+
3. MySQL 8+
4. Git

### Passo 1 — Clonar

```bash
git clone https://github.com/fvandrad/oficina-mecanica.git
cd oficina-mecanica
```

### Passo 2 — Instalar dependências do Frontend (raiz)

```bash
npm install
```

### Passo 3 — Instalar dependências do Backend

```bash
cd backend
npm install
cd ..
```

### Passo 4 — Configurar ambiente do Backend

Crie `backend/.env` com seus valores:

```env
NODE_ENV=development
API_PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=hirata_cars
SESSION_SECRET=troque-esta-chave
DB_CONNECT_TIMEOUT=10000
DB_QUERY_TIMEOUT=10000
```

### Passo 5 — Criar/Importar banco

Opção A (dump completo):

```bash
mysql -u root -p hirata_cars < hirata_cars.sql
```

Opção B (somente schema):

```bash
mysql -u root -p hirata_cars < backend/schema.sql
```

### Passo 6 — Subir Backend

```bash
cd backend
npm run dev
```

### Passo 7 — Subir Frontend (novo terminal)

```bash
npm run dev
```

URLs locais padrão:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 4) Comandos Úteis

### Frontend (raiz)

```bash
npm run dev
npm run build
npm run lint
```

### Backend

```bash
cd backend
npm run dev
npm run start
npm run check
```

## 5) Notas de Segurança

- Timeout de sessão ativo.
- Endpoints protegidos exigem sessão ativa.
- Arquivos de contrato são resolvidos com caminhos seguros no servidor.
- Sanitização de entrada aplicada nos fluxos do frontend.
