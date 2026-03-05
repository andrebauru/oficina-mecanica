#!/bin/bash

# Script de Deploy para Servidor Linux
# Use: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🔨 Compilando o projeto..."
npm run build

echo "📦 Criando arquivo de deployment..."
tar -czf dist-build.tar.gz dist/ db.json package.json

echo "✅ Build concluído!"
echo "📋 Arquivo: dist-build.tar.gz"
echo ""
echo "Próximos passos:"
echo "1. Copie 'dist-build.tar.gz' para o servidor"
echo "2. No servidor, execute:"
echo "   tar -xzf dist-build.tar.gz"
echo "   npm install"
echo "   pm2 start 'json-server --watch db.json --port 3001' --name 'oficina'"
echo "   # Atualize a configuração do nginx com o arquivo DEPLOYMENT.md"
echo "   sudo systemctl reload nginx"
