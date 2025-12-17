@echo off
chcp 65001 >nul
echo ========================================
echo   绩效提成管理系统 - 查看运行日志
echo ========================================
echo.
echo 按 Ctrl+C 退出日志查看
echo.
timeout /t 2 /nobreak >nul

docker-compose logs -f --tail=100
