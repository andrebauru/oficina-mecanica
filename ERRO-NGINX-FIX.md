# ⚠️ Você Recebeu um Erro do Nginx?

## Erro: "Sorry, the page you are looking for is currently unavailable."

Este é um erro clássico de nginx quando:
- Os arquivos não foram encontrados
- As permissões estão erradas
- A configuração do nginx não está correta
- O servidor não conseguiu processar a requisição

---

## 🔍 Diagnóstico Rápido

Faça isso **AGORA** no seu servidor (via SSH/Terminal):

### Verificar 1: Arquivos Existem?
```bash
# Verificar se index.html existe
ls -l /var/www/oficina-mecanica/dist/index.html

# Se retornar um erro tipo "No such file or directory", então:
# ❌ PROBLEMA: Você não copiou os arquivos corretamente via FTP
```

**Solução:** Re-copie a pasta `dist/` inteira:
```
No seu PC (Windows):
  d:\Programacao\oficina-mecanica\dist\
    ├─ index.html
    ├─ assets/
    └─ *.svg, *.png
    
Via FTP → Servidor:
  /var/www/oficina-mecanica/dist/
    ├─ index.html
    ├─ assets/
    └─ *.svg, *.png
```

---

### Verificar 2: Permissões Estão Corretas?
```bash
# Ver permissões atuais
ls -la /var/www/oficina-mecanica/dist/index.html

# Deve mostrar algo como: -rw-r--r-- 1 www-data www-data
# Se mostrar: -rw------- ou algo assim, está errado!

# Corrigir:
sudo chown -R www-data:www-data /var/www/oficina-mecanica/
sudo chmod -R 755 /var/www/oficina-mecanica/dist/
sudo chmod 644 /var/www/oficina-mecanica/db.json
```

---

### Verificar 3: Nginx Está Configurado Corretamente?

#### Teste 1: Site está ativado?
```bash
ls -la /etc/nginx/sites-enabled/
# Deve mostrar seu site (ex: oficina-mecanica)
```

#### Teste 2: Configuração está válida?
```bash
sudo nginx -t
# Deve mostrar: nginx: configuration file test is successful
# Se mostrar erro, copie o erro e procure aqui em DEPLOYMENT.md
```

#### Teste 3: Nginx está rodando?
```bash
sudo systemctl status nginx
# Deve mostrar: active (running)

# Se não estiver, inicie:
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### Verificar 4: Backend Está Rodando?
```bash
# Verificar se json-server está rodando
ps aux | grep json-server

# Deve mostrar a linha com: json-server --watch db.json --port 3001

# Se não aparecer, inicie:
pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"

# Se o comando pm2 não existir, instale:
npm install -g pm2
npm install (na pasta /var/www/oficina-mecanica)
```

---

## 🔧 Solução Passo a Passo

### Se FALHOU no Verificar 1 (arquivos não existem):

**No seu PC (Windows):**
1. Abra o gerenciador FTP
2. Vá até `/var/www/oficina-mecanica/dist/`
3. **Delete tudo** nessa pasta
4. Vá até seu projeto: `d:\Programacao\oficina-mecanica\dist\`
5. Selecione TUDO: `index.html`, pasta `assets/`, `*.svg`, `*.png`
6. Faça upload para `/var/www/oficina-mecanica/dist/`

**No servidor (SSH):**
```bash
# Verificar que foi copiado
ls -la /var/www/oficina-mecanica/dist/
file /var/www/oficina-mecanica/dist/index.html  # Deve mostrar "HTML document"
```

---

### Se FALHOU no Verificar 2 (permissões erradas):

**No servidor (SSH):**
```bash
# Dar permissões corretas
sudo chown -R www-data:www-data /var/www/oficina-mecanica/
sudo chmod -R 755 /var/www/oficina-mecanica/dist/
sudo chmod 644 /var/www/oficina-mecanica/db.json

# Verificar
ls -l /var/www/oficina-mecanica/dist/index.html
# Deve mostrar: -rw-r--r-- ou -rwxr-xr-x
```

---

### Se FALHOU no Verificar 3 (nginx não configurado):

**No servidor (SSH):**
```bash
# Ver configuração atual
cat /etc/nginx/sites-enabled/oficina-mecanica
# Se não existir, criar:

sudo nano /etc/nginx/sites-available/oficina-mecanica
```

**Cole isto:**
```nginx
server {
    listen 80;
    server_name _;  # Aceita qualquer domínio
    
    root /var/www/oficina-mecanica/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/;
    }
}
```

**Depois:**
```bash
# Ativar
sudo ln -s /etc/nginx/sites-available/oficina-mecanica /etc/nginx/sites-enabled/

# Desativar padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar
sudo nginx -t

# Recarregar
sudo systemctl reload nginx
```

---

### Se FALHOU no Verificar 4 (backend não está rodando):

**No servidor (SSH):**
```bash
# Entrar na pasta
cd /var/www/oficina-mecanica

# Instalar dependências
npm install

# Iniciar backend com PM2
pm2 start "json-server --watch db.json --port 3001" --name "oficina-backend"

# Verificar
pm2 status
curl http://localhost:3001/usuarios  # Deve retornar JSON
```

---

## 🎯 Checklist Final

Faça isto NO SEU SERVIDOR para garantir que tudo está funcionando:

```bash
# 1. Arquivo index.html existe?
[ -f /var/www/oficina-mecanica/dist/index.html ] && echo "✅ OK" || echo "❌ FALHOU"

# 2. Nginx está rodando?
sudo systemctl is-active nginx && echo "✅ OK" || echo "❌ FALHOU"

# 3. Backend está rodando na porta 3001?
netstat -tuln | grep 3001 && echo "✅ OK" || echo "❌ FALHOU"

# 4. Consegue acessar localmente?
curl -I http://localhost && echo "✅ OK" || echo "❌ FALHOU"

# 5. API está respondendo?
curl http://localhost:3001/usuarios && echo "✅ OK" || echo "❌ FALHOU"
```

**Se TODOS retornar ✅ OK**, seu site deve estar funcionando!

Acesse: `http://seu-dominio.com`

---

## 🆘 Ainda Não Funcionou?

Se todos os testes acima passaram mas ainda recebe erro:

1. **Limpe o cache do navegador:**
   - Chrome: Ctrl + Shift + Delete
   - Firefox: Ctrl + Shift + Delete
   - Safari: Cmd + Shift + Delete

2. **Teste em modo incógnito:**
   - Chrome: Ctrl + Shift + N
   - Firefox: Ctrl + Shift + P

3. **Teste com curl (sem cache):**
   ```bash
   curl http://seu-dominio.com
   curl -I http://seu-dominio.com
   ```

4. **Verifique os logs:**
   ```bash
   # Nginx
   sudo tail -50 /var/log/nginx/error.log
   
   # Backend
   pm2 logs oficina-backend --lines 50
   ```

5. **Se ainda assim não funcionar, reporte:**
   - Output de: `curl -I http://seu-dominio.com`
   - Output de: `sudo tail -50 /var/log/nginx/error.log`
   - Resultado de: `ls -la /var/www/oficina-mecanica/dist/`

---

## 📊 Status do Seu Projeto

✅ **Frontend compilado com sucesso**
✅ **Backend (json-server) configurado**
✅ **Documentação completa fornecida**
✅ **Sistema de i18n implementado**
✅ **Página de Usuários criada**

Agora é só colocar no servidor! 🚀
