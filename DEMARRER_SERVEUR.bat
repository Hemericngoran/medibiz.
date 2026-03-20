@echo off
title MediBiz Ultimate v3.0 - Serveur
color 0A
cls

echo ╔══════════════════════════════════════════╗
echo ║   MEDIBIZ MANAGER ULTIMATE v3.0          ║
echo ║   Demarrage du serveur...                ║
echo ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Charger les variables d'environnement depuis .env si présent
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%b"=="" set %%a=%%b
    )
    echo [OK] Configuration .env chargee
)

node server/index.js
pause
