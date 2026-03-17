@echo off
chcp 65001 >nul
title Bloom Garden Ultimate
echo ============================================
echo   Bloom Garden Ultimate - Iniciando...
echo ============================================
echo.

:: Verificar se Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo Baixe a versao LTS e reinicie este script apos instalar.
    echo.
    pause
    exit /b 1
)

:: Instalar dependencias se node_modules nao existir
if not exist "node_modules\" (
    echo Instalando dependencias pela primeira vez...
    echo Isso pode demorar alguns minutos.
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando o servidor...
echo.
echo Quando aparecer o endereco (ex: http://localhost:5173),
echo abra-o no seu navegador para jogar!
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo.
npm run dev
pause
