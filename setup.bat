@echo off
title MEG Financial OS - Setup
echo =======================================
echo MEG Financial OS - Setup Alpha 0.3
echo =======================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nao encontrado.
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm.cmd install

echo.
echo Concluido.
echo Para iniciar use: iniciar-meg.bat
pause
