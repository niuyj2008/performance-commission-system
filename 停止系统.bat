@echo off
chcp 65001 >nul
echo ========================================
echo   绩效提成管理系统 - 停止服务
echo ========================================
echo.

echo 正在停止系统...
docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo [✓] 系统已停止
) else (
    echo.
    echo [!] 停止过程中出现问题
)

echo.
pause
