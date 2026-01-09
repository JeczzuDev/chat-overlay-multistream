@echo off
REM Script para iniciar el servidor de Chat Overlay
echo ====================================
echo   Iniciando Chat Overlay Server
echo ====================================
echo.

cd /d "%~dp0"

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no está instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar si existen las dependencias
if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    echo.
)

REM Iniciar el servidor
echo Iniciando servidor en http://localhost:3000
echo Presiona Ctrl+C para detener el servidor
echo.
node server.js

pause
