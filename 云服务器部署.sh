#!/bin/bash

# 绩效提成管理系统 - 云服务器一键部署脚本
# 适用于: Ubuntu 20.04/22.04, CentOS 7/8, Debian 10/11

set -e

echo "========================================"
echo "  绩效提成管理系统 - 云服务器部署"
echo "========================================"
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "[错误] 请使用root用户运行此脚本"
    echo "运行: sudo bash 云服务器部署.sh"
    exit 1
fi

echo "[1/6] 检测操作系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
    echo "[✓] 检测到: $PRETTY_NAME"
else
    echo "[错误] 无法检测操作系统"
    exit 1
fi

echo ""
echo "[2/6] 更新系统包..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update -y
    apt-get upgrade -y
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum update -y
fi
echo "[✓] 系统更新完成"

echo ""
echo "[3/6] 安装Docker..."
if ! command -v docker &> /dev/null; then
    echo "正在安装Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo "[✓] Docker安装完成"
else
    echo "[✓] Docker已安装"
fi

echo ""
echo "[4/6] 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get install -y docker-compose
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y docker-compose
    fi
    echo "[✓] Docker Compose安装完成"
else
    echo "[✓] Docker Compose已安装"
fi

echo ""
echo "[5/6] 配置防火墙..."
# 开放3000端口
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp
    echo "[✓] UFW防火墙已配置"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --reload
    echo "[✓] Firewalld防火墙已配置"
fi

echo ""
echo "[6/6] 部署系统..."
# 创建部署目录
DEPLOY_DIR="/opt/commission-system"
mkdir -p $DEPLOY_DIR

# 检查当前目录是否有系统文件
if [ -f "docker-compose.yml" ]; then
    echo "正在复制系统文件..."
    cp -r . $DEPLOY_DIR/
    cd $DEPLOY_DIR
else
    echo "[错误] 未找到系统文件"
    echo "请确保在系统文件目录中运行此脚本"
    exit 1
fi

# 启动系统
echo "正在启动系统..."
docker-compose up -d --build

# 等待系统启动
echo "等待系统启动..."
sleep 10

# 检查容器状态
if docker ps | grep -q commission-system; then
    echo ""
    echo "========================================"
    echo "  部署成功！"
    echo "========================================"
    echo ""
    echo "访问地址: http://$(curl -s ifconfig.me):3000"
    echo "或使用服务器IP: http://YOUR_SERVER_IP:3000"
    echo ""
    echo "默认管理员账号:"
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    echo "重要提示:"
    echo "  1. 请立即修改管理员密码"
    echo "  2. 建议配置域名和HTTPS"
    echo "  3. 定期备份 $DEPLOY_DIR/data 目录"
    echo ""
    echo "管理命令:"
    echo "  启动: cd $DEPLOY_DIR && docker-compose up -d"
    echo "  停止: cd $DEPLOY_DIR && docker-compose down"
    echo "  日志: cd $DEPLOY_DIR && docker-compose logs -f"
    echo "  重启: cd $DEPLOY_DIR && docker-compose restart"
    echo ""
else
    echo ""
    echo "[错误] 系统启动失败"
    echo "请查看日志: docker-compose logs"
    exit 1
fi

# 创建管理脚本
cat > /usr/local/bin/commission-system << 'EOF'
#!/bin/bash
DEPLOY_DIR="/opt/commission-system"
cd $DEPLOY_DIR

case "$1" in
    start)
        docker-compose up -d
        echo "系统已启动"
        ;;
    stop)
        docker-compose down
        echo "系统已停止"
        ;;
    restart)
        docker-compose restart
        echo "系统已重启"
        ;;
    status)
        docker-compose ps
        ;;
    logs)
        docker-compose logs -f
        ;;
    backup)
        BACKUP_DIR="/opt/backups"
        mkdir -p $BACKUP_DIR
        BACKUP_FILE="$BACKUP_DIR/commission-system-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf $BACKUP_FILE data/
        echo "备份完成: $BACKUP_FILE"
        ;;
    *)
        echo "用法: commission-system {start|stop|restart|status|logs|backup}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/commission-system

echo "已创建管理命令: commission-system"
echo "  commission-system start   - 启动系统"
echo "  commission-system stop    - 停止系统"
echo "  commission-system restart - 重启系统"
echo "  commission-system status  - 查看状态"
echo "  commission-system logs    - 查看日志"
echo "  commission-system backup  - 备份数据"
echo ""
