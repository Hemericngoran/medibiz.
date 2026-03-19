@echo off
title MediBiz Ultimate v3.0 - Installation
color 0A
cls

echo ╔══════════════════════════════════════════╗
echo ║   MEDIBIZ MANAGER ULTIMATE v3.0          ║
echo ║   Auth + Notifications + PWA + Internet  ║
echo ╚══════════════════════════════════════════╝
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERREUR] Node.js n'est pas installe !
    echo Installez-le depuis : https://nodejs.org
    pause & exit
)
echo [OK] Node.js detecte !
echo.
cd /d "%~dp0"
echo Installation des dependances...
call npm install
echo.
echo Construction de l'application React...
call npm run build
echo.
echo ╔══════════════════════════════════════════╗
echo ║   Installation terminee !                ║
echo ║   Lancez : DEMARRER_SERVEUR.bat          ║
echo ╚══════════════════════════════════════════╝
echo.
pause
