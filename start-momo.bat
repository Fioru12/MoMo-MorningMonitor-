@echo off
title MoMo - Morning Monitor
cd /d "%~dp0"
start "" http://localhost:3100
npm run dev
