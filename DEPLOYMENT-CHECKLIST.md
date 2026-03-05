# ✅ Checklist de Deployment

## ✓ Verificações Locais (Antes de Fazer Deploy)

- [ ] Projeto compila sem erros: `npm run build`
- [ ] Pasta `dist/` foi criada
- [ ] Arquivo `dist/index.html` existe
- [ ] Testes locais funcionam: `npm run dev`
- [ ] Arquivo `db.json` existe
- [ ] Arquivo `package.json` existe

## ✓ Preparação para FTP

- [ ] Criar pasta no servidor: `/var/www/oficina-mecanica/`
- [ ] Criar subpasta: `/var/www/oficina-mecanica/dist/`
- [ ] Criar subpasta: `/var/www/oficina-mecanica/assets/` (se necessário)

## ✓ Upload via FTP

### Arquivos a Copiar:

1. **Frontend (Obrigatório)**
   - [ ] `dist/index.html` → `/var/www/oficina-mecanica/dist/`
   - [ ] `dist/assets/*` → `/var/www/oficina-mecanica/dist/assets/`
   - [ ] `dist/*.svg` → `/var/www/oficina-mecanica/dist/`
   - [ ] `dist/*.png` → `/var/www/oficina-mecanica/dist/`

2. **Backend (Obrigatório)**
   - [ ] `db.json` → `/var/www/oficina-mecanica/`
   - [ ] `package.json` → `/var/www/oficina-mecanica/`

## ✓ Configuração do Servidor (SSH/Terminal)

```bash
# 1. Navegar até o diretório
cd /var/www/oficina-mecanica

# 2. Instalar dependências do Node.js
npm install

# 3. Verificar se a porta 3001 está disponível
sudo netstat -tuln | grep 3001

# 4. Iniciar json-server em background (3 opções)

# Opção A: Simples (não recomendado para produção)
nohup npx json-server --watch db.json --port 3001 > json-server.log 2>&1 &

# Opção B: Com PM2 (RECOMENDADO)
npm install -g pm2
pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"
pm2 save
pm2 startup
pm2 status

# Opção C: Com systemd (mais profissional)
# Veja o arquivo de exemplo: oficina-backend.service
```

## ✓ Configuração do Nginx

1. [ ] Criar arquivo `/etc/nginx/sites-available/oficina-mecanica`
2. [ ] Copiar configuração do `DEPLOYMENT.md`
3. [ ] Criar link simbólico:
   ```bash
   sudo ln -s /etc/nginx/sites-available/oficina-mecanica /etc/nginx/sites-enabled/
   ```
4. [ ] Desabilitar site padrão (opcional):
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```
5. [ ] Testar configuração:
   ```bash
   sudo nginx -t
   ```
6. [ ] Recarregar nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## ✓ Verificação de Permissões

```bash
# Dar permissão de leitura para nginx
sudo chown -R www-data:www-data /var/www/oficina-mecanica/dist/
sudo chmod -R 755 /var/www/oficina-mecanica/dist/

# Dar permissão para db.json
sudo chmod 644 /var/www/oficina-mecanica/db.json
```

## ✓ Testes Finais

- [ ] Acessar `http://seu-dominio.com` no navegador
- [ ] Verificar se o Frontend carrega
- [ ] Acessar `http://seu-dominio.com/api/usuarios` (deve retornar JSON)
- [ ] Testar navegação nas páginas
- [ ] Testar criação/edição/deleção de dados

## ✓ Troubleshooting

### Erro: "nginx: Sorry, the page you are looking for is currently unavailable"

**Possíveis Causas:**

1. Arquivos não foram copiados corretamente
   ```bash
   ls -la /var/www/oficina-mecanica/dist/
   file /var/www/oficina-mecanica/dist/index.html
   ```

2. Permissões incorretas
   ```bash
   sudo chmod -R 755 /var/www/oficina-mecanica/dist/
   ```

3. Nginx não consegue ler os arquivos
   ```bash
   sudo chown -R www-data:www-data /var/www/oficina-mecanica/
   ```

### Erro: API retorna 404 ou "connection refused"

1. Verificar se json-server está rodando:
   ```bash
   ps aux | grep json-server
   netstat -tuln | grep 3001
   ```

2. Iniciar json-server novamente:
   ```bash
   pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"
   ```

3. Verificar logs:
   ```bash
   pm2 logs oficina-backend
   tail -f json-server.log
   ```

### Erro: "Cross-Origin Request Blocked" (CORS)

- Isso significa que o Frontend não consegue acessar a API
- Verifique se a URL da API no código aponta para localhost:3001
- Configure o nginx para redirecionar `/api` para `localhost:3001`
- Veja a configuração de proxy no `DEPLOYMENT.md`

## ✓ Monitoramento Contínuo

```bash
# Visualizar logs em tempo real
pm2 logs oficina-backend

# Monitorar processos
pm2 monit

# Verificar status
pm2 status

# Reboot automático após restart do servidor
pm2 startup
pm2 save

# Ver logs do nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## ✓ Backup

Antes de qualquer atualização, faça backup:

```bash
# Backup completo
cd /var/www
tar -czf oficina-mecanica-backup-$(date +%Y%m%d).tar.gz oficina-mecanica/

# Ou apenas o banco de dados
cp /var/www/oficina-mecanica/db.json /var/www/oficina-mecanica/db.json.backup
```

## ✓ Atualização Futura

Para fazer update do código:

```bash
# 1. Localmente, compile novamente
npm run build

# 2. Via FTP, copie os arquivos da pasta dist/

# 3. Recarregue a página no navegador (Ctrl+Shift+R para limpar cache)
```

---

**Dúvidas?** Veja o arquivo `DEPLOYMENT.md` para mais detalhes!
