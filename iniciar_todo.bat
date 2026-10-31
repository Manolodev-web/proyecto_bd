@echo off
title Sistema Multigestor - Grupo 4
color 0b

echo ===================================================
echo   INICIANDO ENTORNO MULTIGESTOR - GRUPO 4
echo   PostgreSQL - MySQL - SQL Server - Oracle 23ai
echo ===================================================

cd /d C:\proyecto_bd

echo [1/3] Encendiendo contenedores en Docker...
docker compose up -d
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo [ERROR] Fallo al iniciar Docker Compose.
    echo Verifica que Docker Desktop este abierto y en ejecucion.
    echo.
    pause
    exit /b %errorlevel%
)

echo [2/3] Levantando servidor Backend en puerto 4000...
start "Backend - Grupo 4" cmd /c "cd /d C:\proyecto_bd\backend && npm run dev"

echo [3/3] Levantando aplicacion Frontend en puerto 5173...
start "Frontend - Grupo 4" cmd /c "cd /d C:\proyecto_bd\frontend && npm run dev"

echo.
echo Esperando inicializacion de servicios...
timeout /t 5 /nobreak >nul

echo Abriendo navegador web...
start http://localhost:5173

echo ===================================================
echo   SISTEMA ACTIVO CORRECTAMENTE
echo ===================================================
timeout /t 3 >nul
