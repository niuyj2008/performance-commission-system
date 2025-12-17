#!/bin/bash

echo "🚀 准备部署到 Render..."
echo ""

# 检查是否是 git 仓库
if [ ! -d .git ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    echo "✅ Git 仓库初始化完成"
else
    echo "✅ Git 仓库已存在"
fi

# 添加所有文件
echo ""
echo "📝 添加文件到 Git..."
git add .

# 提交
echo ""
echo "💾 提交更改..."
git commit -m "Prepare for Render deployment" || echo "没有新的更改需要提交"

# 检查是否有远程仓库
if git remote | grep -q origin; then
    echo ""
    echo "✅ 远程仓库已配置"
    echo "📤 推送到 GitHub..."
    git push origin main || git push origin master
else
    echo ""
    echo "⚠️  未配置远程仓库"
    echo ""
    echo "请按照以下步骤操作："
    echo "1. 在 GitHub 创建一个新仓库"
    echo "2. 运行以下命令添加远程仓库："
    echo "   git remote add origin https://github.com/你的用户名/你的仓库名.git"
    echo "3. 推送代码："
    echo "   git push -u origin main"
    echo ""
    echo "然后访问 https://render.com 进行部署"
    exit 1
fi

echo ""
echo "✅ 代码已推送到 GitHub"
echo ""
echo "📋 下一步："
echo "1. 访问 https://render.com"
echo "2. 登录并点击 'New +' → 'Blueprint'"
echo "3. 选择你的 GitHub 仓库"
echo "4. Render 会自动检测 render.yaml 并开始部署"
echo ""
echo "📖 详细步骤请查看: RENDER_DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 准备完成！"
