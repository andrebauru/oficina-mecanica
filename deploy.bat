@echo off
REM ============================================================
REM deploy.bat — Push local para o repositório (Hirata Cars)
REM Executar no PC de desenvolvimento: deploy.bat
REM ============================================================

echo.
echo ====================================================
echo  Hirata Cars — Deploy Local (git push)
echo ====================================================
echo.

REM Perguntar mensagem do commit
set /p COMMIT_MSG="Mensagem do commit (Enter = 'chore: update'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=chore: update

echo.
echo [1/5] Validando build local...
call npm run build
if errorlevel 1 (
	echo ❌ Build falhou. Push cancelado.
	exit /b 1
)

echo.
echo [2/5] Adicionando todos os arquivos alterados...
git add -A

echo.
echo [3/5] Criando commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%" || echo (nada novo para commitar, continuando...)

echo.
echo [4/5] Enviando para origin/master (--force)...
git push origin master --force

echo.
echo [5/5] Status atual do repositorio:
git log --oneline -5

echo.
echo ====================================================
echo  Push concluido! Acesse o servidor e rode: ./deploy.sh
echo ====================================================
echo.
pause
