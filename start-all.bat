@echo off
title Crypto Intelligence Platform
echo ===== 安装依赖（如已安装可忽略） =====
npm install

echo.
echo ===== 启动后端服务 (http://localhost:4000) =====
start cmd /k "cd /d %~dp0server && npm run dev"

echo.
echo ===== 启动前端界面 (http://localhost:5173) =====
start cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo 所有服务已启动，如浏览器未自动打开，请手动访问：http://localhost:5173
pause


