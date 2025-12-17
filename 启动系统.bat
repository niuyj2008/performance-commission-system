@echo off
chcp 65001 >nul
echo ========================================
echo   绩效提成管理系统 - 一键启动
echo ========================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Docker，请先安装 Docker Desktop
    echo.
    echo 请访问: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo [1/4] 检查 Docker 服务状态...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 服务未启动，请先启动 Docker Desktop
    echo.
    pause
    exit /b 1
)
echo [✓] Docker 服务正常

echo.
echo [2/4] 停止旧容器（如果存在）...
docker-compose down 2>nul

echo.
echo [3/4] 构建并启动系统...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo [4/4] 等待系统启动...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   系统启动成功！
echo ========================================
echo.
echo 访问地址: http://localhost:3000
echo.
echo 默认管理员账号:
echo   用户名: admin
echo   密码: admin123
echo.
echo 提示:
echo   - 首次启动可能需要1-2分钟
echo   - 如需停止系统，请运行"停止系统.bat"
echo   - 数据保存在 data 文件夹中
echo.
echo 正在打开浏览器...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
pause
