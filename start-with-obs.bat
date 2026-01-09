@echo off
REM Script para iniciar servidor + OBS automáticamente
echo ====================================
echo   Chat Overlay + OBS Launcher
echo ====================================
echo.

cd /d "%~dp0"

REM Iniciar servidor en segundo plano
echo [1/2] Iniciando servidor...
start /min "Chat Overlay Server" cmd /c "node server.js"

REM Esperar 3 segundos para que el servidor inicie
timeout /t 3 /nobreak >nul

REM Buscar e iniciar OBS
echo [2/2] Buscando OBS Studio...

set OBS_PATH=
if exist "C:\Program Files\obs-studio\bin\64bit\obs64.exe" set OBS_PATH=C:\Program Files\obs-studio\bin\64bit\obs64.exe
if exist "C:\Program Files (x86)\obs-studio\bin\64bit\obs64.exe" set OBS_PATH=C:\Program Files (x86)\obs-studio\bin\64bit\obs64.exe
if exist "%ProgramFiles%\obs-studio\bin\64bit\obs64.exe" set OBS_PATH=%ProgramFiles%\obs-studio\bin\64bit\obs64.exe

if "%OBS_PATH%"=="" (
    echo.
    echo AVISO: No se encontró OBS Studio en las rutas comunes
    echo Por favor inicia OBS manualmente
    echo.
    echo El servidor está corriendo en: http://localhost:3000
    pause
    exit /b 0
)

echo Iniciando OBS Studio...
start "" "%OBS_PATH%"

echo.
echo ====================================
echo   Todo listo!
echo ====================================
echo Servidor: http://localhost:3000
echo Overlay: http://localhost:3000/overlay.html
echo.
echo Para detener el servidor, cierra la ventana
echo "Chat Overlay Server" en la barra de tareas
echo ====================================
