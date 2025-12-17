# 绩效提成管理系统 - 快速开始

## 🚀 5分钟快速部署

### 第一步: 安装Docker
- **Windows**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Mac**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: 运行 `curl -fsSL https://get.docker.com | sh`

### 第二步: 启动系统

#### Windows用户
双击 `启动系统.bat` 文件

#### Mac/Linux用户
```bash
./启动系统.sh
```

### 第三步: 访问系统
浏览器打开: http://localhost:3000

### 第四步: 登录
- 用户名: `admin`
- 密码: `admin123`

## ✅ 就这么简单！

---

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| `启动系统.bat` | Windows一键启动 |
| `启动系统.sh` | Mac/Linux一键启动 |
| `停止系统.bat` | Windows停止服务 |
| `停止系统.sh` | Mac/Linux停止服务 |
| `查看日志.bat` | 查看运行日志 |
| `备份数据.bat` | 备份数据库 |
| `部署指南.md` | 详细部署文档 |

---

## 🔧 常用操作

### 启动系统
```bash
# Windows
双击 启动系统.bat

# Mac/Linux
./启动系统.sh
```

### 停止系统
```bash
# Windows
双击 停止系统.bat

# Mac/Linux
./停止系统.sh
```

### 备份数据
```bash
# Windows
双击 备份数据.bat

# Mac/Linux
cp -r data 备份/data_$(date +%Y%m%d)
```

---

## 📞 遇到问题？

1. 查看 `部署指南.md` 中的"常见问题"章节
2. 运行 `查看日志.bat` 查看错误信息
3. 确保Docker Desktop已启动
4. 确保3000端口未被占用

---

## 🔒 安全提示

⚠️ **首次登录后请立即修改密码！**

1. 登录系统
2. 点击右上角用户名
3. 选择"修改密码"
4. 设置强密码

---

## 📊 系统要求

- **CPU**: 2核或以上
- **内存**: 2GB或以上
- **硬盘**: 20GB可用空间
- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+

---

## 📖 更多信息

详细的部署和使用说明请查看 `部署指南.md`

---

**技术支持**: 如有问题请联系系统管理员
