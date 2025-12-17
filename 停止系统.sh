#!/bin/bash

echo "========================================"
echo "  绩效提成管理系统 - 停止服务"
echo "========================================"
echo ""

echo "正在停止系统..."
docker-compose down

if [ $? -eq 0 ]; then
    echo ""
    echo "[✓] 系统已停止"
else
    echo ""
    echo "[!] 停止过程中出现问题"
fi

echo ""
