#!/bin/bash
# Hirata Cars - Script de Atualização Segura

set -euo pipefail

PROJECT_DIR="/var/www/hiratacars.jp"
cd "$PROJECT_DIR"

echo "Protegendo arquivo .env..."
if [ -f "backend/.env" ]; then
    cp "backend/.env" "/tmp/.env.bak"
fi

echo "Sincronizando com o GitHub..."
git fetch --all
git reset --hard origin/master

echo "Restaurando .env..."
if [ -f "/tmp/.env.bak" ]; then
    mv "/tmp/.env.bak" "backend/.env"
    chmod 600 "backend/.env"
fi

echo "Instalando dependências e build..."
cd backend
npm install
cd ..
npm install
npm run build

echo "Ajustando permissões de uploads..."
mkdir -p backend/uploads/documentos
mkdir -p backend/uploads/contracts
mkdir -p backend/uploads/customer_images
chmod 775 backend/uploads/documentos
chmod 775 backend/uploads/contracts
chmod -R 775 backend/uploads

echo "Garantindo permissão de execução do deploy..."
chmod +x deploy.sh

echo "Reiniciando PM2..."
pm2 restart hirata-backend
pm2 save

echo "Sistema Hirata Cars atualizado e protegido!"
