# 绩效提成管理系统 - Render 部署版

这是一个建筑设计公司的绩效提成分配管理系统，已配置好在 Render 平台部署。

## 快速部署

### 一键部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 手动部署步骤

1. Fork 或 Clone 此仓库到你的 GitHub
2. 访问 [Render Dashboard](https://dashboard.render.com)
3. 点击 "New +" → "Blueprint"
4. 选择此仓库
5. Render 会自动检测 `render.yaml` 并部署

详细步骤请查看 [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

## 系统功能

- ✅ 基于建筑属性的提成总额计算
- ✅ 基于空调面积表的部门间分配
- ✅ 部门内部灵活分配
- ✅ 项目追加处理
- ✅ Excel 导入导出
- ✅ 半年度汇总报表
- ✅ 多级权限管理

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite（持久化存储）
- **前端**: 原生 HTML/CSS/JavaScript
- **部署**: Render（免费套餐）

## 环境要求

- Node.js 14+
- SQLite 3

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问系统
open http://localhost:3000
```

## 部署配置

项目已包含 `render.yaml` 配置文件，支持：
- ✅ 自动部署
- ✅ 持久化存储（1GB）
- ✅ 环境变量管理
- ✅ 自动 HTTPS

## 许可证

MIT
