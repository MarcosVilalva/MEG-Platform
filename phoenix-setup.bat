@echo off
title MEG Platform - Project Phoenix Setup
echo Instalando dependencias e preparando banco...
call npm.cmd install
call npm.cmd run db:generate
call npm.cmd run db:push
call npm.cmd run db:seed
echo.
echo Setup concluido.
pause
