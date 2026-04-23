#!/bin/bash

# ============================================================
# deploy.sh — Deploy no Servidor Linux (Hirata Cars)
# Executar DENTRO do servidor: ./deploy.sh
# ============================================================

set -e

PROJECT_DIR="/var/www/oficina-mecanica"

echo "🚀 Iniciando deploy — $(date '+%Y-%m-%d %H:%M:%S')"

# 1. Entrar na pasta do projeto
cd "$PROJECT_DIR"
echo "📁 Diretório: $PROJECT_DIR"

# 2. Atualizar código do repositório
echo "🔄 Atualizando código..."
git fetch --all
git reset --hard origin/master

# 3. Instalar dependências do Backend
echo "📦 Instalando dependências do backend..."
cd backend
npm install
cd ..

# 4. Instalar dependências do Frontend e fazer build
echo "📦 Instalando dependências do frontend..."
npm install

echo "🔨 Compilando frontend..."
npm run build

# 5. Reiniciar serviço via PM2
echo "♻️  Reiniciando serviço PM2..."
pm2 restart hirata-backend
pm2 save

echo ""
echo "✅ Deploy concluído com sucesso — $(date '+%Y-%m-%d %H:%M:%S')"
