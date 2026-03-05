# Guia de Deployment - Oficina Mecânica

## O que precisa ser copiado para o servidor

Você precisa copiar:

1. **Pasta `dist/`** - Contém os arquivos compilados (Frontend React)
2. **Pasta `backend/`** (se existir) - Ou iniciar o json-server
3. **Arquivo `db.json`** - Banco de dados
4. **Arquivo `package.json`** - Para instalar dependências do backend

## Estrutura no servidor

Recomenda-se a seguinte estrutura:

```
/var/www/oficina-mecanica/
├── dist/                    # Frontend compilado
│   ├── index.html
│   ├── assets/
│   └── ...
├── db.json                  # Banco de dados
├── package.json             # Para backend
├── node_modules/            # Dependências instaladas
└── nginx.conf               # Configuração nginx
```

## Configuração do Nginx

Crie um arquivo de configuração nginx com este conteúdo:

```nginx
# /etc/nginx/sites-available/oficina-mecanica

upstream json_server {
    server localhost:3001;
}

server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Configuração para HTTP -> HTTPS (opcional)
    # return 301 https://$server_name$request_uri;
    
    root /var/www/oficina-mecanica/dist;
    index index.html;
    
    # Frontend SPA - Todas as rotas devem retornar index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # Assets com cache maior
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        add_header Cache-Control "public, max-age=31536000";
        access_log off;
    }
    
    # API Backend (json-server)
    location /api/ {
        proxy_pass http://json_server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Redirecionar /localhost:3001 para /api
    location ~ ^/(.+)$ {
        if ($uri ~ ^/index) {
            break;
        }
        proxy_pass http://json_server/$uri;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## Passos para fazer o deployment

### 1. No seu PC (local):
```bash
# Compilar o projeto
npm run build

# Verificar que dist/ foi criado
ls dist/
```

### 2. Via FTP:
- Copiar **tudo** da pasta `dist/` para `/var/www/oficina-mecanica/dist/`
- Copiar `db.json` para `/var/www/oficina-mecanica/`
- Copiar `package.json` para `/var/www/oficina-mecanica/`

### 3. No servidor (via SSH):
```bash
# Navegue até o diretório
cd /var/www/oficina-mecanica

# Instale dependências do backend
npm install

# Inicie o json-server em background
nohup npx json-server --watch db.json --port 3001 > json-server.log 2>&1 &

# Ou use um process manager (recomendado):
npm install -g pm2
pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"
pm2 save
pm2 startup
```

### 4. Configure o Nginx:
```bash
# Crie o arquivo de configuração
sudo nano /etc/nginx/sites-available/oficina-mecanica

# Copie a configuração acima

# Ative o site
sudo ln -s /etc/nginx/sites-available/oficina-mecanica /etc/nginx/sites-enabled/

# Teste a configuração
sudo nginx -t

# Recarregue o nginx
sudo systemctl reload nginx
```

## Verificação

Depois de tudo configurado, acesse:
- `http://seu-dominio.com` - Frontend
- `http://seu-dominio.com/api/usuarios` - Teste da API

## Possíveis problemas

### 1. "Sorry, the page you are looking for is currently unavailable"
- **Causa**: Nginx não consegue servir os arquivos
- **Solução**: Verifique permissões da pasta `dist/` e se o `index.html` existe

```bash
ls -la /var/www/oficina-mecanica/dist/index.html
chmod -R 755 /var/www/oficina-mecanica/dist/
```

### 2. API retorna erro 404
- **Causa**: json-server não está rodando
- **Solução**: Verificar se o processo está ativo

```bash
ps aux | grep json-server
netstat -tuln | grep 3001  # Verificar se porta 3001 está listening
```

### 3. CORS errors
- **Causa**: Frontend e backend em portas diferentes
- **Solução**: Verificar configuração de proxy no nginx

### 4. Arquivo index.html não está sendo servido para rotas
- **Causa**: Configuração `try_files` não está correta
- **Solução**: Verifique a diretiva `try_files $uri $uri/ /index.html;`

## URL da API no Frontend

Verifique se a API no frontend está apontando para o lugar certo. 

No código React, se está usando `http://localhost:3001`, isso funcionará APENAS localmente.

Para o servidor, você pode:

**Opção 1** - Usar URLs relativas (recomendado):
```typescript
// ao invés de
axios.get('http://localhost:3001/usuarios')

// use
axios.get('/api/usuarios')
```

**Opção 2** - Usar variáveis de ambiente:
```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
axios.get(`${API_URL}/usuarios`)
```

## Resumo Rápido

1. ✅ Compilar: `npm run build`
2. ✅ Copiar `dist/` via FTP
3. ✅ Copiar `db.json` e `package.json`
4. ✅ No servidor: `npm install`
5. ✅ No servidor: `pm2 start "json-server --watch db.json --port 3001" --name "oficina"`
6. ✅ Configurar nginx.conf
7. ✅ Testar: `nginx -t` e `systemctl reload nginx`

