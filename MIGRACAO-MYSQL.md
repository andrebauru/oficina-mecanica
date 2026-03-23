# Migração para MySQL (Hirata Cars)

## 1) Pré-requisitos
- MySQL 8+
- Node.js 18+
- Dependências do backend instaladas

## 2) Configurar variáveis de ambiente
1. Copie [backend/.env.example](backend/.env.example) para `backend/.env`.
2. Ajuste:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `SESSION_SECRET`

Também mantenha [/.env.example](.env.example) para o frontend em dev.

## 3) Criar schema no MySQL
Execute [backend/schema.sql](backend/schema.sql) no MySQL Workbench ou CLI.

### Via CLI
```bash
mysql -u root -p < backend/schema.sql
```

## 4) Instalar dependências do backend
```bash
cd backend
npm install
```

## 5) Importar dados atuais do db.json
No diretório `backend`:
```bash
npm run import:json
```

Isso lê `../db.json` e popula as tabelas no MySQL.

## 6) Subir backend MySQL
```bash
cd backend
npm run dev
```

Backend em `http://localhost:3001`.

## 7) Subir frontend
No diretório raiz:
```bash
npm run dev
```

O Vite já está configurado para proxy de `/api` para `localhost:3001` em [vite.config.ts](vite.config.ts).

## 8) Validar sessão de 1 hora
- Login normal no sistema
- Ficar inativo por mais de 60 min
- Na próxima atividade/requisição, a sessão expira automaticamente e o usuário é deslogado

## 9) Checklist de verificação
- [ ] `GET /api/health` retorna `status: ok`
- [ ] CRUD de clientes, veículos, serviços, peças, financeiro, vendas e parcelas funcionando
- [ ] Documentos/fotos visíveis
- [ ] Recibo gerado e salvo em documentos do cliente
- [ ] Build frontend sem erros
