#!/bin/bash

echo "========================================"
echo "  绩效提成管理系统 - 一键启动"
echo "========================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "[错误] 未检测到 Docker，请先安装 Docker"
    echo ""
    echo "macOS: brew install --cask docker"
    echo "Linux: 请访问 https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

echo "[1/4] 检查 Docker 服务状态..."
if ! docker info &> /dev/null; then
    echo "[错误] Docker 服务未启动，请先启动 Docker"
    echo ""
    exit 1
fi
echo "[✓] Docker 服务正常"

echo ""
echo "[2/4] 停止旧容器（如果存在）..."
docker-compose down 2>/dev/null

echo ""
echo "[3/4] 构建并启动系统..."
docker-compose up -d --build

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 启动失败，请检查错误信息"
    exit 1
fi

echo ""
echo "[4/4] 等待系统启动..."
sleep 5

echo ""
echo "========================================"
echo "  系统启动成功！"
echo "========================================"
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "默认管理员账号:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "提示:"
echo "  - 首次启动可能需要1-2分钟"
echo "  - 如需停止系统，请运行 ./停止系统.sh"
echo "  - 数据保存在 data 文件夹中"
echo ""

# macOS 自动打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "正在打开浏览器..."
    sleep 2
    open http://localhost:3000
fi
