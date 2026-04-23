#!/bin/bash
# Hirata Cars - Script de Atualização Segura

PROJECT_DIR="/var/www/oficina-mecanica"
cd "$PROJECT_DIR"

echo "🛡️  Protegendo arquivo .env..."
if [ -f "backend/.env" ]; then
	cp backend/.env /tmp/.env.hirata.bak
fi

echo "🔄 Sincronizando com o GitHub..."
git fetch --all
git reset --hard origin/master

echo "♻️  Restaurando .env..."
if [ -f "/tmp/.env.hirata.bak" ]; then
	mv /tmp/.env.hirata.bak backend/.env
	chmod 600 backend/.env
fi

echo "📦 Instalando dependências e Build..."
cd backend && npm install && cd ..
npm install
npm run build

echo "📂 Ajustando permissões para os Contratos Multilíngues..."
mkdir -p backend/uploads/contracts
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod -R 775 backend/uploads
chmod +x deploy.sh

echo "🚀 Reiniciando PM2..."
pm2 restart hirata-backend
pm2 save

echo "✅ Sistema Hirata Cars atualizado e protegido!"
