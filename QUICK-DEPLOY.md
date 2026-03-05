# 🚀 Deploy Rápido - Oficina Mecânica

## Seu Problema

Você recebeu esse erro após fazer upload via FTP:
```
Sorry, the page you are looking for is currently unavailable.
Please try again later.
```

## Solução Rápida

### 1️⃣ Verifique Localmente

Antes de subir para o servidor, certifique-se que compilou:

```bash
npm run build
```

Verifique se existem esses arquivos:
- ✅ `dist/index.html`
- ✅ `dist/assets/index-*.js` (arquivo JavaScript)
- ✅ `dist/assets/index-*.css` (arquivo CSS)

### 2️⃣ Upload Correto via FTP

Você precisa copiar **TUDO** para o servidor:

```
Seu PC (Local)              →    Servidor
┌─────────────────┐             ┌──────────────────────────┐
│ dist/           │             │ /var/www/oficina-mecanica│
│  ├─ index.html  │  ─────→     │ /dist/                   │
│  ├─ assets/     │             │  ├─ index.html           │
│  └─ *.svg/*.png │             │  └─ assets/              │
│                 │             │                          │
│ db.json         │  ─────→     │ db.json                  │
│ package.json    │  ─────→     │ package.json             │
└─────────────────┘             └──────────────────────────┘
```

### 3️⃣ No Servidor (via SSH/Terminal)

```bash
# Entrar na pasta
cd /var/www/oficina-mecanica

# Instalar dependências do Node.js
npm install

# Iniciar o backend (json-server)
pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"

# Verifique se está rodando
pm2 status
```

### 4️⃣ Configurar Nginx

Crie/edite o arquivo `/etc/nginx/sites-available/oficina-mecanica`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    root /var/www/oficina-mecanica/dist;
    index index.html;
    
    # Frontend - Serve static files, fallback to index.html for SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001/;
    }
}
```

Depois execute:

```bash
# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx
```

### 5️⃣ Teste

Acesse no navegador:
- `http://seu-dominio.com` - Deve mostrar o app
- `http://seu-dominio.com/api/usuarios` - Deve retornar JSON

## ⚠️ Problemas Comuns

### Problema: "Sorry, the page you are currently looking for..."

**Causas mais prováveis:**

1. **Arquivos não foram copiados**
   ```bash
   ls -la /var/www/oficina-mecanica/dist/
   # Deve mostrar: index.html, assets/, etc
   ```

2. **Permissões erradas**
   ```bash
   sudo chown -R www-data:www-data /var/www/oficina-mecanica/dist/
   sudo chmod -R 755 /var/www/oficina-mecanica/dist/
   ```

3. **Nginx não reiniciou**
   ```bash
   sudo systemctl reload nginx
   ```

### Problema: API não funciona (404 ou timeout)

1. **json-server não está rodando**
   ```bash
   ps aux | grep json-server
   netstat -tuln | grep 3001
   
   # Se não aparecer, inicie:
   pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"
   ```

2. **db.json não está no lugar certo**
   ```bash
   ls -la /var/www/oficina-mecanica/db.json
   # Deve existir!
   ```

3. **Nginx não está proxy-pasando para o backend**
   ```bash
   curl http://localhost:3001/usuarios
   # Se funcionar localmente, o problema é a configuração do nginx
   ```

## 🔍 Verificação Passo a Passo

```bash
# 1. Verificar se index.html existe
test -f /var/www/oficina-mecanica/dist/index.html && echo "✅ index.html existe" || echo "❌ Falta index.html"

# 2. Verificar se assets estão lá
ls -la /var/www/oficina-mecanica/dist/assets/ | head -5

# 3. Verificar permissões
stat -c "%a %U:%G %n" /var/www/oficina-mecanica/dist/index.html

# 4. Verificar json-server
curl http://localhost:3001/usuarios

# 5. Verificar nginx
sudo nginx -t

# 6. Ver logs de erro do nginx
sudo tail -20 /var/log/nginx/error.log
```

## 📝 Checklist Final

- [ ] Compilou localmente com `npm run build`
- [ ] Copiou `dist/` para `/var/www/oficina-mecanica/dist/`
- [ ] Copiou `db.json` para `/var/www/oficina-mecanica/`
- [ ] Copiou `package.json` para `/var/www/oficina-mecanica/`
- [ ] Executou `npm install` no servidor
- [ ] Iniciou json-server com `pm2 start ...`
- [ ] Configurou nginx com try_files
- [ ] Executou `sudo systemctl reload nginx`
- [ ] Testou `http://seu-dominio.com` no navegador
- [ ] Testou `/api/usuarios` retorna JSON

## 🆘 Ainda Não Funcionou?

Envie as informações:

1. Output de:
   ```bash
   curl -I http://seu-dominio.com
   curl -I http://seu-dominio.com/index.html
   curl http://seu-dominio.com/api/usuarios
   ```

2. Conteúdo de:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   pm2 logs oficina-backend
   ```

3. Confirmação de:
   ```bash
   ls -la /var/www/oficina-mecanica/dist/
   ps aux | grep json-server
   netstat -tuln | grep 3001
   ```

---

**Dúvidas?** Leia os arquivos:
- `DEPLOYMENT.md` - Guia completo
- `DEPLOYMENT-CHECKLIST.md` - Checklist detalhado
