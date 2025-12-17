# Render 部署检查清单

## 部署前检查 ✅

- [ ] 已安装 Git
- [ ] 已有 GitHub 账号
- [ ] 代码已提交到本地 Git
- [ ] 已创建 GitHub 仓库
- [ ] 代码已推送到 GitHub
- [ ] 已注册 Render 账号

## 配置文件检查 ✅

- [x] `render.yaml` - Render 部署配置
- [x] `package.json` - Node.js 依赖配置
- [x] `.gitignore` - Git 忽略文件配置
- [x] `server/index.js` - 服务器入口文件
- [x] 环境变量使用 `process.env.PORT`

## 部署步骤 📋

### 1. 推送代码到 GitHub

```bash
# 如果还没有初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Ready for Render deployment"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送
git push -u origin main
```

### 2. 在 Render 创建服务

1. 访问 https://render.com
2. 登录（使用 GitHub 账号登录最方便）
3. 点击 "New +" 按钮
4. 选择 "Blueprint"
5. 连接你的 GitHub 账号
6. 选择项目仓库
7. 点击 "Apply"

### 3. 等待部署完成

- 部署时间：约 3-5 分钟
- 可以在 "Logs" 查看部署进度
- 看到 "服务器运行在..." 表示部署成功

### 4. 验证部署

访问以下 URL 验证：
- 主页：`https://你的应用名.onrender.com`
- 健康检查：`https://你的应用名.onrender.com/api/health`

## 部署后配置 ⚙️

### 1. 记录应用 URL
```
应用 URL: https://_____________________.onrender.com
```

### 2. 测试登录
- [ ] 访问登录页面
- [ ] 使用默认账号登录
- [ ] 检查各功能是否正常

### 3. 导入数据（可选）
- [ ] 导入员工数据
- [ ] 导入项目数据
- [ ] 导入空调面积表

## 常见问题 ❓

### Q: 应用访问很慢？
A: 免费套餐会在 15 分钟无活动后休眠，首次访问需要等待 30-60 秒启动。

**解决方案**：使用 UptimeRobot 定期访问保持活跃
1. 访问 https://uptimerobot.com
2. 创建 HTTP(s) 监控
3. URL: `https://你的应用.onrender.com/api/health`
4. 间隔: 5 分钟

### Q: 数据会丢失吗？
A: 不会。已配置持久化磁盘，数据会永久保存。

### Q: 如何更新应用？
A: 推送代码到 GitHub，Render 会自动重新部署。

```bash
git add .
git commit -m "Update features"
git push origin main
```

### Q: 如何查看日志？
A: 在 Render Dashboard → 选择服务 → Logs 标签

### Q: 如何重启应用？
A: 在 Render Dashboard → 选择服务 → Manual Deploy → Clear build cache & deploy

## 性能优化建议 🚀

### 1. 使用 UptimeRobot 保持活跃
避免应用休眠，提供更好的用户体验。

### 2. 启用 CDN（可选）
如果有自定义域名，可以使用 Cloudflare CDN 加速。

### 3. 数据库优化
- 定期备份数据库
- 监控数据库大小（免费套餐 1GB）

## 升级到付费套餐（可选）

如果需要更好的性能：
- **Starter Plan**: $7/月
  - 不会休眠
  - 更快的启动速度
  - 更多资源

## 技术支持 💬

- Render 文档: https://render.com/docs
- Render 社区: https://community.render.com
- 项目文档: 查看 RENDER_DEPLOYMENT_GUIDE.md

## 部署状态

- [ ] 代码已推送到 GitHub
- [ ] Render 服务已创建
- [ ] 部署成功
- [ ] 应用可访问
- [ ] 登录功能正常
- [ ] 数据持久化正常

---

**部署日期**: _______________
**应用 URL**: _______________
**部署人**: _______________

🎉 祝部署顺利！
