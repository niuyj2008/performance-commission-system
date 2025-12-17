# 绩效提成管理系统

建筑设计公司内部使用的绩效提成分配管理系统

## 功能特点

- 基于建筑属性的提成总额计算
- 基于空调面积表的部门间分配
- 部门内部灵活分配
- 项目追加处理
- Excel导入导出
- 半年度汇总报表

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite
- **前端**: 原生HTML/CSS/JavaScript
- **部署**: 字节扣子平台

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问系统

打开浏览器访问: http://localhost:3000

## 项目结构

```
├── server/              # 后端代码
│   ├── index.js        # 服务器入口
│   ├── db/             # 数据库相关
│   ├── routes/         # API路由
│   ├── middleware/     # 中间件
│   └── utils/          # 工具函数
├── public/             # 前端静态文件
│   ├── index.html      # 主页
│   ├── css/            # 样式文件
│   └── js/             # JavaScript文件
├── data/               # 数据库文件
├── uploads/            # 上传文件
└── tests/              # 测试文件
```

## 开发指南

### API文档

详见 `/docs/api.md`

### 数据库设计

详见 `/docs/database.md`

## 部署

系统设计为部署在字节扣子平台，具体部署步骤详见 `/docs/deployment.md`

## 许可证

MIT
