# Script PowerShell para iniciar el servidor de Chat Overlay
# Uso: .\start-server.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Iniciando Chat Overlay Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del script
Set-Location $PSScriptRoot

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "  Por favor instala Node.js desde https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar si existen las dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Iniciar el servidor
Write-Host "Iniciando servidor en http://localhost:3000" -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

node server.js
