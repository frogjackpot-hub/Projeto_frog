#!/bin/sh

echo "🚀 Iniciando aplicação..."

# Aguardar o banco de dados estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 5

# Executar migrações
echo "📦 Executando migrações..."
npm run migrate

# Executar seeds
echo "🌱 Executando seeds..."
npm run seed

# Iniciar aplicação
echo "✅ Iniciando servidor..."
npm start
