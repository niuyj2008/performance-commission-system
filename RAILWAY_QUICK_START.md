# 🚂 Railway 快速部署指南

## 5 分钟部署到 Railway

### 前提条件
- ✅ 代码已推送到 GitHub
- ✅ Railway 账号（免费）

---

## 步骤 1: 访问 Railway

打开浏览器访问：**https://railway.app**

## 步骤 2: 登录

1. 点击 **"Login"** 或 **"Start a New Project"**
2. 选择 **"Login with GitHub"**（推荐）
3. 授权 Railway 访问你的 GitHub

## 步骤 3: 创建新项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 在仓库列表中找到 **`performance-commission-system`**
4. 点击 **"Deploy Now"**

## 步骤 4: 等待初始部署

- Railway 会自动检测 Node.js 项目
- 自动安装依赖
- 自动启动应用
- 大约 2-3 分钟完成

## 步骤 5: 配置环境变量

部署完成后：

1. 点击你的服务（service）
2. 点击 **"Variables"** 标签
3. 点击 **"New Variable"**
4. 添加以下变量：

### 必需的环境变量

```
NODE_ENV=production
```

```
JWT_SECRET=<生成一个随机密钥>
```

**生成 JWT_SECRET：**
在终端运行：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
复制输出的字符串作为 JWT_SECRET 的值

## 步骤 6: 配置持久化存储

1. 在服务页面，点击 **"Settings"** 标签
2. 向下滚动找到 **"Volumes"** 部分
3. 点击 **"New Volume"**
4. 配置：
   - **Mount Path**: `/app/data`
5. 点击 **"Add"**

## 步骤 7: 生成公开 URL

1. 在服务页面，点击 **"Settings"** 标签
2. 找到 **"Networking"** 部分
3. 点击 **"Generate Domain"**
4. Railway 会生成一个公开 URL，例如：
   ```
   https://performance-commission-system-production.up.railway.app
   ```

## 步骤 8: 重新部署

配置完环境变量和持久化卷后，需要重新部署：

1. 点击 **"Deployments"** 标签
2. 点击右上角的 **"Deploy"** 按钮
3. 等待部署完成（约 2 分钟）

## 步骤 9: 访问应用

1. 复制生成的 URL
2. 在浏览器中打开
3. 系统会自动重定向到登录页

---

## 验证部署

### 健康检查
访问：`https://你的应用.railway.app/api/health`

应该返回：
```json
{"status":"ok","message":"系统运行正常"}
```

### 登录系统
使用默认账号登录（查看 `server/db/seed.js` 了解默认账号）

---

## 常见问题

### Q: 如何查看日志？
A: 在 Railway Dashboard → 选择服务 → "Deployments" 标签 → 点击最新部署

### Q: 数据会丢失吗？
A: 不会！已配置持久化卷（Volume），数据永久保存在 `/app/data`

### Q: 如何更新应用？
A: 推送代码到 GitHub，Railway 会自动重新部署
```bash
git add .
git commit -m "Update"
git push origin main
```

### Q: 费用是多少？
A: 免费！$5 月度额度足够小型应用使用

### Q: 如何查看资源使用？
A: Railway Dashboard → 点击项目 → "Usage" 标签

---

## 完整配置清单

### 环境变量
- [x] `NODE_ENV=production`
- [x] `JWT_SECRET=<随机密钥>`

### 持久化卷
- [x] Mount Path: `/app/data`

### 网络
- [x] 已生成公开域名

---

## 下一步

✅ 部署成功后：
1. 修改默认密码
2. 导入员工数据
3. 导入项目数据
4. 开始使用系统

---

**预计总时间**: 5-10 分钟
**难度**: ⭐⭐☆☆☆
**推荐指数**: ⭐⭐⭐⭐⭐

🎉 开始部署吧！
