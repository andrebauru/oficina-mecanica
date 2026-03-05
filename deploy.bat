@echo off
REM Script de Deploy para Windows
REM Use: deploy.bat

echo.
echo 🔨 Compilando o projeto...
call npm run build

if errorlevel 1 (
    echo ❌ Erro na compilação!
    exit /b 1
)

echo.
echo ✅ Build concluído!
echo.
echo 📋 Próximos passos:
echo.
echo 1. Copie a pasta 'dist\' via FTP para o servidor
echo    - Destino: /var/www/oficina-mecanica/dist/
echo.
echo 2. Copie o arquivo 'db.json' para /var/www/oficina-mecanica/
echo.
echo 3. Copie o arquivo 'package.json' para /var/www/oficina-mecanica/
echo.
echo 4. No servidor Linux, execute:
echo    cd /var/www/oficina-mecanica
echo    npm install
echo    pm2 start "json-server --watch db.json --port 3001" --name "oficina"
echo.
echo 5. Configure o Nginx:
echo    - Veja o arquivo DEPLOYMENT.md para a configuração
echo    - Execute: sudo systemctl reload nginx
echo.
echo 📖 Leia o arquivo DEPLOYMENT.md para mais detalhes!
echo.
pause
