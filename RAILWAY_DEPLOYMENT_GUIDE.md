# 🚂 Railway 部署指南

Railway 是最适合你的应用的部署平台，因为它支持 SQLite 持久化存储且完全免费（$5 月度额度）。

## 为什么选择 Railway？

- ✅ 支持 SQLite 持久化存储（数据不会丢失）
- ✅ 不需要修改任何代码
- ✅ 自动 HTTPS
- ✅ 不会自动休眠
- ✅ 部署速度快（2-3 分钟）
- ✅ $5 月度免费额度（约 500 小时运行时间）

## 快速部署步骤

### 步骤 1: 注册 Railway 账号

1. 访问 https://railway.app
2. 点击 "Login" 或 "Start a New Project"
3. 使用 GitHub 账号登录（推荐）

### 步骤 2: 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 如果是第一次，需要授权 Railway 访问 GitHub
4. 选择 `performance-commission-system` 仓库

### 步骤 3: 配置环境变量

Railway 会自动检测 Node.js 项目并开始部署。部署完成后：

1. 点击你的服务
2. 进入 "Variables" 标签
3. 添加以下环境变量：

```
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key-here
```

生成 JWT_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 步骤 4: 配置持久化存储

1. 在服务页面，点击 "Settings" 标签
2. 找到 "Volumes" 部分
3. 点击 "Add Volume"
4. 配置：
   - **Mount Path**: `/app/data`
   - 点击 "Add"

### 步骤 5: 生成公开 URL

1. 在服务页面，点击 "Settings" 标签
2. 找到 "Networking" 部分
3. 点击 "Generate Domain"
4. Railway 会生成一个公开 URL

### 步骤 6: 等待部署完成

- 部署时间：约 2-3 分钟
- 在 "Deployments" 标签查看进度
- 看到 "Success" 表示部署成功

### 步骤 7: 访问应用

点击生成的 URL，例如：
```
https://performance-commission-system-production.up.railway.app
```

## 验证部署

### 1. 健康检查
访问：`https://你的应用.railway.app/api/health`

应该返回：
```json
{"status":"ok","message":"系统运行正常"}
```

### 2. 登录系统
- 系统会自动重定向到登录页
- 使用默认账号登录（查看 `server/db/seed.js`）

## 数据持久化

### 配置持久化卷

Railway 的持久化卷确保数据不会丢失：

1. **Volume 配置**
   - Mount Path: `/app/data`
   - 数据库文件会保存在这里

2. **验证持久化**
   - 创建一些测试数据
   - 重新部署应用
   - 检查数据是否还在

## 更新部署

### 自动部署
推送代码到 GitHub，Railway 会自动重新部署：
```bash
git add .
git commit -m "Update features"
git push origin main
```

### 手动部署
在 Railway Dashboard：
1. 选择你的服务
2. 点击 "Deployments" 标签
3. 点击 "Deploy" 按钮

## 查看日志

1. 在 Railway Dashboard 选择你的服务
2. 点击 "Deployments" 标签
3. 点击最新的部署
4. 查看实时日志

## 监控资源使用

1. 在 Railway Dashboard 点击 "Usage"
2. 查看：
   - CPU 使用率
   - 内存使用率
   - 网络流量
   - 月度费用

## 免费额度说明

### 包含内容
- ✅ $5 月度额度
- ✅ 约 500 小时运行时间
- ✅ 持久化存储
- ✅ 自动 HTTPS
- ✅ 自定义域名

### 费用计算
- 运行时间：$0.000231/分钟
- 内存：$0.000231/GB/分钟
- 通常一个小应用每月 $3-5

### 超出额度
- 应用会暂停
- 可以升级到 Hobby Plan ($5/月起)

## 环境变量配置

### 必需的环境变量
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<生成的密钥>
```

### 可选的环境变量
```
DB_PATH=/app/data/database.sqlite
```

## 自定义域名（可选）

1. 在服务页面，点击 "Settings"
2. 找到 "Domains" 部分
3. 点击 "Add Domain"
4. 输入你的域名
5. 配置 DNS 记录（Railway 会提供说明）

## 故障排查

### 部署失败
1. 查看 "Deployments" 中的日志
2. 检查 `package.json` 依赖
3. 确认 Node.js 版本兼容

### 应用无法访问
1. 检查部署状态是否为 "Success"
2. 确认已生成公开域名
3. 查看日志是否有错误

### 数据丢失
1. 确认已配置 Volume
2. 检查 Mount Path 是否正确
3. 确认数据库路径指向 Volume

## 性能优化

### 1. 配置持久化卷
确保数据库文件在持久化卷中

### 2. 优化数据库
- 添加索引
- 定期清理旧数据
- 使用连接池

### 3. 监控资源
- 定期查看 CPU 和内存使用
- 优化慢查询
- 减少不必要的日志

## 备份数据

### 手动备份
1. 使用 Railway CLI 下载数据库文件
2. 或通过应用导出 Excel

### 自动备份
考虑使用定时任务定期导出数据

## 升级选项

### Hobby Plan ($5/月)
- $5 月度额度 + $5 基础费用
- 更多资源
- 优先支持

### Pro Plan ($20/月)
- $20 月度额度
- 团队协作
- 高级功能

## 与 Render 对比

| 功能 | Railway | Render Free |
|------|---------|-------------|
| 持久化存储 | ✅ 支持 | ❌ 不支持 |
| 自动休眠 | ❌ 不休眠 | ✅ 15分钟休眠 |
| 月度额度 | $5 | 750小时 |
| 启动速度 | 快 | 慢（休眠后） |
| SQLite 支持 | ✅ 完美 | ⚠️ 有限 |

## 技术支持

- Railway 文档: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: 在你的仓库创建 Issue

## 下一步

部署成功后：
1. 修改默认密码
2. 导入员工数据
3. 导入项目数据
4. 配置提成规则
5. 开始使用系统

---

**预计部署时间**: 5-10 分钟
**难度**: ⭐⭐☆☆☆（简单）
**推荐指数**: ⭐⭐⭐⭐⭐

🚂 开始部署吧！Railway 是最适合你的选择。
