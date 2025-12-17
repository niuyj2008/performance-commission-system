@echo off
chcp 65001 >nul
echo ========================================
echo   绩效提成管理系统 - 数据备份
echo ========================================
echo.

REM 创建备份文件夹
if not exist "备份" mkdir "备份"

REM 生成备份文件名（包含日期时间）
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%a%%b%%c)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set datetime=%mydate%_%mytime%

set backup_file=备份\数据备份_%datetime%.zip

echo 正在备份数据库文件...
echo.

REM 使用 PowerShell 压缩文件
powershell -command "Compress-Archive -Path 'data\*' -DestinationPath '%backup_file%' -Force"

if %errorlevel% equ 0 (
    echo [✓] 备份成功！
    echo.
    echo 备份文件: %backup_file%
    echo.
    echo 提示: 请定期将备份文件复制到其他安全位置
) else (
    echo [错误] 备份失败
)

echo.
pause
