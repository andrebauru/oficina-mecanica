@echo off
REM Script para instalar dependências do backend da Hirata Cars CRM

echo.
echo ========================================
echo Instalando dependências do backend...
echo ========================================
echo.

cd backend

echo Executando: npm install
npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Dependências instaladas com sucesso!
    echo ========================================
    echo.
    echo Próximos passos:
    echo 1. Executar o schema.sql no MySQL:
    echo    mysql -u user_hirata -p hirata_cars ^< backend\schema.sql
    echo.
    echo 2. Iniciar o servidor:
    echo    npm run dev
    echo.
    echo 3. Testar as novas funcionalidades de CRM
    echo.
) else (
    echo.
    echo Erro ao instalar dependências!
    echo.
)

pause
