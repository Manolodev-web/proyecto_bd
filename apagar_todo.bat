@echo off
echo ===================================================
echo   APAGANDO ENTORNO MULTIGESTOR - GRUPO 4
echo ===================================================

echo [1/2] Deteniendo los 4 contenedores Docker...
cd /d C:\proyecto_bd
docker compose stop

echo [2/2] Cerrando procesos de Node.js (Backend y Frontend)...
taskkill /f /im node.exe >nul 2>&1

echo ===================================================
echo   Entorno detenido y memoria RAM liberada.
echo ===================================================
pause
