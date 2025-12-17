# Render 部署指南

## 准备工作

### 1. 注册 Render 账号
- 访问 https://render.com
- 点击 "Get Started" 或 "Sign Up"
- 可以使用 GitHub、GitLab 或 Email 注册（推荐使用 GitHub）

### 2. 准备 GitHub 仓库

如果你还没有将代码推送到 GitHub：

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit for Render deployment"

# 创建 GitHub 仓库后，添加远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送代码
git push -u origin main
```

## 部署步骤

### 方法一：使用 render.yaml 自动部署（推荐）

1. **连接 GitHub 仓库**
   - 登录 Render Dashboard
   - 点击 "New +" 按钮
   - 选择 "Blueprint"
   - 连接你的 GitHub 账号
   - 选择你的项目仓库
   - Render 会自动检测 `render.yaml` 文件

2. **确认配置**
   - 检查服务名称、区域等配置
   - 点击 "Apply" 开始部署

3. **等待部署完成**
   - 部署过程大约需要 3-5 分钟
   - 可以在 "Logs" 标签查看部署日志

### 方法二：手动创建 Web Service

1. **创建新服务**
   - 登录 Render Dashboard
   - 点击 "New +" 按钮
   - 选择 "Web Service"

2. **连接仓库**
   - 连接你的 GitHub 账号
   - 选择项目仓库
   - 点击 "Connect"

3. **配置服务**
   - **Name**: `performance-commission-system`
   - **Region**: Singapore（或其他离你近的区域）
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **添加环境变量**
   点击 "Advanced" 展开高级设置，添加以下环境变量：
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `JWT_SECRET` = `your-secret-key-here`（生成一个随机字符串）

5. **添加持久化磁盘**
   - 在 "Advanced" 部分找到 "Disks"
   - 点击 "Add Disk"
   - **Name**: `data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: 1 GB

6. **创建服务**
   - 点击 "Create Web Service"
   - 等待部署完成

## 部署后配置

### 1. 查看应用 URL
部署成功后，Render 会提供一个 URL，格式如下：
```
https://performance-commission-system.onrender.com
```

### 2. 初始化数据库
首次部署后，数据库会自动初始化。你可以通过以下方式验证：
- 访问 `https://你的应用.onrender.com/api/health`
- 应该返回：`{"status":"ok","message":"系统运行正常"}`

### 3. 访问系统
- 打开浏览器访问你的 Render URL
- 系统会自动重定向到登录页面
- 使用默认账号登录（查看 `server/db/seed.js` 了解默认账号）

## 重要提示

### 免费套餐限制
- ⚠️ **自动休眠**：15 分钟无活动后会自动休眠
- ⚠️ **启动时间**：休眠后首次访问需要等待 30-60 秒启动
- ⚠️ **运行时间**：每月 750 小时（足够一个应用全天运行）
- ✅ **持久化存储**：1GB 免费存储空间，数据不会丢失

### 保持应用活跃（可选）
如果不想应用休眠，可以使用以下方法：

1. **使用 UptimeRobot**（推荐）
   - 访问 https://uptimerobot.com
   - 创建免费账号
   - 添加 HTTP(s) 监控
   - URL: `https://你的应用.onrender.com/api/health`
   - 监控间隔: 5 分钟
   - 这样可以保持应用始终运行

2. **使用 Cron-job.org**
   - 访问 https://cron-job.org
   - 创建定时任务
   - 每 10 分钟访问一次你的应用

## 更新部署

### 自动部署
- 推送代码到 GitHub 的 main 分支
- Render 会自动检测并重新部署

### 手动部署
- 在 Render Dashboard 中
- 点击 "Manual Deploy" → "Deploy latest commit"

## 查看日志

在 Render Dashboard 中：
- 选择你的服务
- 点击 "Logs" 标签
- 可以实时查看应用日志

## 自定义域名（可选）

免费套餐支持自定义域名：
1. 在 Render Dashboard 中选择你的服务
2. 点击 "Settings" → "Custom Domain"
3. 添加你的域名
4. 按照提示配置 DNS 记录

## 故障排查

### 部署失败
- 检查 "Logs" 中的错误信息
- 确保 `package.json` 中的依赖正确
- 确保 Node.js 版本兼容

### 应用无法访问
- 检查服务状态是否为 "Live"
- 查看日志是否有错误
- 确认端口配置正确（使用 `process.env.PORT`）

### 数据库问题
- 确保持久化磁盘已正确配置
- 检查挂载路径是否正确
- 查看日志中的数据库初始化信息

## 成本估算

免费套餐完全够用：
- ✅ 750 小时/月运行时间
- ✅ 1GB 持久化存储
- ✅ 自动 HTTPS
- ✅ 自动部署
- ✅ 无需信用卡

## 技术支持

- Render 文档: https://render.com/docs
- Render 社区: https://community.render.com
- 项目 Issues: 在你的 GitHub 仓库创建 Issue

## 下一步

部署成功后，你可以：
1. 导入员工数据
2. 导入项目数据
3. 配置提成规则
4. 开始使用系统

祝部署顺利！🚀
