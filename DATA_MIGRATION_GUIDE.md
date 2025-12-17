# 📦 数据迁移指南

将本地数据库数据迁移到 Railway 部署环境

---

## 方案 1: 使用导出/导入脚本（推荐）

### 步骤 1: 导出本地数据

在本地项目目录运行：

```bash
node export-database.js
```

这会生成 `database-export.json` 文件，包含所有数据。

### 步骤 2: 将导出文件添加到项目

```bash
git add database-export.json import-database.js
git commit -m "Add database export for migration"
git push origin main
```

### 步骤 3: 在 Railway 中运行导入

1. 在 Railway Dashboard 中，点击你的服务
2. 点击 "Settings" 标签
3. 找到 "Deploy" 部分
4. 在 "Custom Start Command" 中临时设置：
   ```
   node import-database.js && npm start
   ```
5. 点击 "Deploy" 重新部署

### 步骤 4: 恢复正常启动命令

导入完成后：
1. 回到 Settings → Deploy
2. 删除 Custom Start Command（恢复为空）
3. 重新部署

---

## 方案 2: 使用 Railway CLI（更简单）

### 步骤 1: 安装 Railway CLI

```bash
npm install -g @railway/cli
```

或使用 Homebrew：
```bash
brew install railway
```

### 步骤 2: 登录 Railway

```bash
railway login
```

### 步骤 3: 链接项目

```bash
railway link
```

选择你的项目。

### 步骤 4: 导出本地数据

```bash
node export-database.js
```

### 步骤 5: 上传数据库文件

```bash
# 连接到 Railway 环境
railway run node import-database.js
```

---

## 方案 3: 直接上传 SQLite 文件

### 步骤 1: 复制本地数据库

```bash
cp database.sqlite database-backup.sqlite
```

### 步骤 2: 使用 Railway CLI 上传

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 上传数据库文件到 Volume
railway run bash
# 在 Railway shell 中：
# 然后使用 scp 或其他方式上传文件
```

---

## 方案 4: 通过 API 导入（最灵活）

### 步骤 1: 导出数据

```bash
node export-database.js
```

### 步骤 2: 创建导入 API 端点

在 `server/routes/` 创建一个临时的导入端点（仅用于迁移）。

### 步骤 3: 通过 HTTP 上传数据

使用 Postman 或 curl 将 JSON 数据发送到 Railway 应用。

---

## 推荐方案对比

| 方案 | 难度 | 速度 | 适用场景 |
|------|------|------|----------|
| 方案 1 | ⭐⭐ | 快 | 小到中型数据 |
| 方案 2 | ⭐⭐⭐ | 快 | 需要 CLI 工具 |
| 方案 3 | ⭐⭐⭐⭐ | 最快 | 大型数据库 |
| 方案 4 | ⭐⭐⭐⭐⭐ | 中 | 需要自定义逻辑 |

---

## 快速开始（推荐方案 1）

### 1. 导出数据

```bash
node export-database.js
```

### 2. 提交到 Git

```bash
git add database-export.json import-database.js
git commit -m "Add database export"
git push origin main
```

### 3. 在 Railway 中导入

在 Railway Dashboard → Settings → Deploy → Custom Start Command:
```
node import-database.js && npm start
```

点击 "Deploy"

### 4. 验证数据

访问应用，检查数据是否正确导入。

### 5. 恢复启动命令

删除 Custom Start Command，重新部署。

---

## 注意事项

### 密码处理
- 用户密码已经是哈希值，可以直接导入
- 不需要重新加密

### ID 冲突
- 使用 `INSERT OR REPLACE` 避免冲突
- 保持原有 ID 不变

### 外键约束
- 按照依赖顺序导入表
- 先导入父表，再导入子表

### 数据验证
导入后验证：
- 用户数量
- 项目数量
- 部门数量
- 分配记录

---

## 故障排查

### 导出失败
- 检查本地数据库文件是否存在
- 确认 `database.sqlite` 路径正确

### 导入失败
- 查看 Railway 日志
- 检查 JSON 文件格式
- 确认表结构匹配

### 数据丢失
- 检查导出的 JSON 文件
- 验证每个表的记录数
- 重新运行导入脚本

---

## 数据备份

### 定期备份
建议定期导出数据：
```bash
node export-database.js
cp database-export.json backups/backup-$(date +%Y%m%d).json
```

### 自动备份
可以设置定时任务自动备份数据。

---

**开始迁移吧！** 🚀
