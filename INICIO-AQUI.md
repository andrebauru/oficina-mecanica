# 📚 Guias de Deployment - Índice Completo

## � Você Tem WordPress?

Se você quer adicionar um link da Oficina Mecânica no menu do WordPress:

➡️ **COMECE AQUI:** [WORDPRESS-RESUMO.md](WORDPRESS-RESUMO.md)

Este arquivo tem:
- Visão geral completa
- Todos os guias WordPress
- Checklist rápido

---

## �🚨 Você Recebeu Erro no Servidor?

Se você recebeu: **"Sorry, the page you are looking for is currently unavailable"**

➡️ **COMECE AQUI:** [ERRO-NGINX-FIX.md](ERRO-NGINX-FIX.md)

Este arquivo tem:
- Diagnóstico rápido em 5 verificações
- Soluções passo a passo
- Checklist para garantir funcionamento

---

## � Integração com WordPress

### 📱 WORDPRESS-QUICK.md - Integração em 5 Passos
**Para:** Adicionar link da Oficina no menu WordPress  
**Tempo:** ~5 minutos

Contém:
- Instruções rápidas para integração
- Como copiar arquivos
- Como adicionar link no menu

📌 **Use se:** Você tem WordPress e quer adicionar um link

---

### 📖 WORDPRESS-INTEGRATION.md - Guia Completo WordPress
**Para:** Entender todas as opções de integração  
**Tempo:** ~20 minutos

Contém:
- 3 opções de integração (link direto, iframe, subdiretório)
- Configuração nginx para WordPress
- Troubleshooting

📌 **Use se:** Você quer explorar diferentes formas de integrar

---



### 1. 🚀 QUICK-DEPLOY.md - Solução Rápida (5 passos)
**Para:** Você quer ir rápido!  
**Tempo:** ~10 minutos

Contém:
- Problema e solução rápida
- 5 passos principais
- Problemas comuns e fixes

📌 **Use se:** Você já fez deploy antes ou está com pressa

---

### 2. 📋 DEPLOYMENT-CHECKLIST.md - Checklist Completo
**Para:** Ter certeza que não esqueceu nada  
**Tempo:** ~20 minutos

Contém:
- ✅ Verificações locais
- ✅ Checklist de upload FTP
- ✅ Checklist de configuração
- ✅ Testes finais
- ✅ Troubleshooting

📌 **Use se:** Você quer ter segurança que fez tudo certo

---

### 3. 📖 DEPLOYMENT.md - Documentação Completa
**Para:** Entender tudo em detalhes  
**Tempo:** ~30 minutos de leitura

Contém:
- Explicação completa da arquitetura
- Configuração nginx detalhada
- Múltiplas opções de setup
- URLs relativas vs absolutas
- Configuração de variáveis de ambiente

📌 **Use se:** Você quer entender cada detalhe ou encontrou um problema específico

---

### 4. 🆘 ERRO-NGINX-FIX.md - Solução de Erros
**Para:** Seu site retorna erro do nginx  
**Tempo:** ~15 minutos

Contém:
- Diagnóstico em 4 verificações
- Soluções passo a passo
- Checklist final
- Debug commands

📌 **Use se:** Você já tentou fazer deploy e deu erro

---

### 5. 🔧 SERVER-FIX.md - Status e Resumo
**Para:** Entender a situação geral  
**Tempo:** ~5 minutos de leitura

Contém:
- Status do projeto (tudo pronto!)
- Resumo dos 3 guias principais
- Próximos passos
- Dicas importantes

📌 **Use se:** Você quer um resumo geral

---

## � Todos os Guias

| Arquivo | Para | Tempo |
|---------|------|-------|
| **[WORDPRESS-QUICK.md](WORDPRESS-QUICK.md)** | 🔗 WordPress em 5 passos | 5 min |
| **[WORDPRESS-INTEGRATION.md](WORDPRESS-INTEGRATION.md)** | 🔗 Todas as opções WordPress | 20 min |
| **[QUICK-DEPLOY.md](QUICK-DEPLOY.md)** | 🚀 Deploy rápido | 10 min |
| **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)** | ✅ Checklist completo | 20 min |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | 📖 Documentação completa | 30 min |
| **[ERRO-NGINX-FIX.md](ERRO-NGINX-FIX.md)** | 🆘 Erro nginx | 15 min |
| **[SERVER-FIX.md](SERVER-FIX.md)** | 🔧 Resumo e status | 5 min |

---

## 🎯 Fluxo de Deploy Recomendado

```
1. Compilar Localmente
   └─> npm run build

2. Escolher Seu Guia
   ├─> QUICK-DEPLOY.md (5 passos)
   ├─> DEPLOYMENT-CHECKLIST.md (seguro)
   └─> DEPLOYMENT.md (detalhado)

3. Fazer Upload via FTP
   ├─> dist/ → /var/www/oficina-mecanica/dist/
   ├─> db.json → /var/www/oficina-mecanica/
   └─> package.json → /var/www/oficina-mecanica/

4. Configurar Servidor
   ├─> npm install
   ├─> pm2 start json-server
   └─> Configurar nginx

5. Testar
   ├─> Acessar http://seu-dominio.com
   ├─> Testar /api/usuarios
   └─> Se erro → Ver ERRO-NGINX-FIX.md
```

---

## 📦 O Que Foi Feito Para Você

### ✅ Sistema de Idiomas (i18n)
- Suporte para Português e Filipino
- Seletor de idioma no menu
- Traduções para toda a interface

**Arquivos:**
- `src/utils/i18n.ts` - Sistema de tradução
- `src/components/LanguageContext.tsx` - Context global

### ✅ Gerenciamento de Usuários
- Página completa de CRUD
- Seleção de idioma ao criar usuário
- Validação de formulário

**Arquivo:**
- `src/pages/Usuarios.tsx`

### ✅ Documentação de Deployment
- 5 guias diferentes para diferentes necessidades
- Scripts prontos para deploy
- Configurações prontas para copiar

**Arquivos:**
- `DEPLOYMENT.md`, `QUICK-DEPLOY.md`, `DEPLOYMENT-CHECKLIST.md`, `ERRO-NGINX-FIX.md`

---

## 🎯 Qual é o Seu Caso?

### Se você TEM WordPress e quer adicionar um link no menu
👉 **[WORDPRESS-QUICK.md](WORDPRESS-QUICK.md)** (5 minutos)

### Se você AINDA NÃO FEZ o deploy
👉 **[QUICK-DEPLOY.md](QUICK-DEPLOY.md)** (10 minutos)

### Se você JÁ TENTOU e DEU ERRO
👉 **[ERRO-NGINX-FIX.md](ERRO-NGINX-FIX.md)** (15 minutos)

### Se você QUER GARANTIR QUE TEM TUDO
👉 **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)** (20 minutos)

### Se você QUER ENTENDER TUDO
👉 **[DEPLOYMENT.md](DEPLOYMENT.md)** (30 minutos)

---

## 💡 Dicas Finais

1. **Sempre compile antes:** `npm run build`
2. **Use PM2 para gerenciar processos:** `pm2 start "json-server --watch db.json --port 3001"`
3. **Verifique permissões:** `sudo chown -R www-data:www-data /var/www/...`
4. **Configure nginx com `try_files`:** Necessário para SPA React
5. **Teste a API antes do frontend:** `curl http://localhost:3001/usuarios`
6. **Use logs para debug:** `sudo tail /var/log/nginx/error.log`

---

## 🆘 Suporte Rápido

| Problema | Arquivo |
|----------|---------|
| "Página não encontrada" | ERRO-NGINX-FIX.md |
| Não sei por onde começar | QUICK-DEPLOY.md |
| Quer checklist completo | DEPLOYMENT-CHECKLIST.md |
| Quer aprender detalhes | DEPLOYMENT.md |
| Resumo geral da situação | SERVER-FIX.md |

---

**Bom deployment! 🚀**

Todos os guias estão prontos para você seguir. Escolha um e comece!
