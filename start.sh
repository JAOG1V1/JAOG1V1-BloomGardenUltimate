#!/bin/bash

echo "============================================"
echo "  🌸 Bloom Garden Ultimate - Iniciando..."
echo "============================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo ""
    echo "Por favor, instale o Node.js em: https://nodejs.org/"
    echo "Baixe a versão LTS e reexecute este script após instalar."
    echo ""
    exit 1
fi

# Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências pela primeira vez..."
    echo "Isso pode demorar alguns minutos."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências."
        exit 1
    fi
    echo ""
fi

echo "Iniciando o servidor..."
echo ""
echo "Quando aparecer o endereço (ex: http://localhost:5173),"
echo "abra-o no seu navegador para jogar!"
echo ""
echo "Pressione Ctrl+C para encerrar o servidor."
echo ""
npm run dev
