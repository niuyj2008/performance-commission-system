# Railway 部署检查清单 ✅

## 部署前准备

- [x] 代码已推送到 GitHub
- [x] 已有 Railway 账号
- [ ] 已登录 Railway

## 部署步骤

### 1. 创建项目
- [ ] 访问 https://railway.app
- [ ] 点击 "New Project"
- [ ] 选择 "Deploy from GitHub repo"
- [ ] 选择 `performance-commission-system` 仓库
- [ ] 点击 "Deploy Now"

### 2. 配置环境变量
- [ ] 点击服务 → "Variables" 标签
- [ ] 添加 `NODE_ENV=production`
- [ ] 生成并添加 `JWT_SECRET`

**生成 JWT_SECRET：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 配置持久化存储
- [ ] 点击 "Settings" 标签
- [ ] 找到 "Volumes" 部分
- [ ] 点击 "New Volume"
- [ ] Mount Path: `/app/data`
- [ ] 点击 "Add"

### 4. 生成公开域名
- [ ] 点击 "Settings" 标签
- [ ] 找到 "Networking" 部分
- [ ] 点击 "Generate Domain"
- [ ] 记录生成的 URL

### 5. 重新部署
- [ ] 点击 "Deployments" 标签
- [ ] 点击 "Deploy" 按钮
- [ ] 等待部署完成

## 部署后验证

### 1. 健康检查
- [ ] 访问 `https://你的应用.railway.app/api/health`
- [ ] 确认返回 `{"status":"ok","message":"系统运行正常"}`

### 2. 访问系统
- [ ] 打开应用 URL
- [ ] 确认重定向到登录页
- [ ] 尝试登录

### 3. 测试功能
- [ ] 项目管理功能正常
- [ ] 员工管理功能正常
- [ ] 提成计算功能正常

## 配置记录

### 应用信息
```
应用 URL: https://_____________________.railway.app
部署日期: _______________
```

### 环境变量
```
NODE_ENV: production
JWT_SECRET: ✅ 已配置
```

### 持久化卷
```
Mount Path: /app/data
状态: ✅ 已配置
```

## 常见问题排查

### 部署失败
- [ ] 检查 Deployments 日志
- [ ] 确认 package.json 正确
- [ ] 验证 Node.js 版本

### 应用无法访问
- [ ] 确认部署状态为 "Success"
- [ ] 检查是否已生成域名
- [ ] 查看日志错误信息

### 数据丢失
- [ ] 确认 Volume 已配置
- [ ] 检查 Mount Path 正确
- [ ] 验证数据库路径

## 性能监控

### 资源使用
- [ ] 查看 CPU 使用率
- [ ] 查看内存使用率
- [ ] 查看月度费用

### 日志监控
- [ ] 定期查看应用日志
- [ ] 监控错误信息
- [ ] 记录异常情况

## 维护任务

### 每周
- [ ] 检查应用运行状态
- [ ] 查看资源使用情况
- [ ] 备份重要数据

### 每月
- [ ] 查看月度费用
- [ ] 优化资源使用
- [ ] 更新依赖包

## 升级计划

### 当前套餐
- 免费套餐
- $5 月度额度
- 持久化存储

### 升级选项
- [ ] Hobby Plan ($5/月)
- [ ] Pro Plan ($20/月)

---

**部署状态**: ⬜ 未开始 / 🟡 进行中 / ✅ 已完成

**最后更新**: _______________
