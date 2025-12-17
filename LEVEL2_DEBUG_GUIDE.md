# 第二级部门分配调试指南

## 问题现象
部门经理登录后，在项目详情页的第二级仍然显示"需要配置空调面积表才能计算部门分配"。

## 调试步骤

### 1. 清除浏览器缓存
**重要**: 必须清除浏览器缓存才能看到最新的代码

**Chrome/Edge**:
1. 按 `Cmd+Shift+Delete` (Mac) 或 `Ctrl+Shift+Delete` (Windows)
2. 选择"缓存的图片和文件"
3. 点击"清除数据"

**或者使用硬刷新**:
- Mac: `Cmd+Shift+R`
- Windows: `Ctrl+Shift+R` 或 `Ctrl+F5`

### 2. 打开浏览器开发者工具
1. 按 `F12` 或右键点击页面选择"检查"
2. 切换到 "Console" 标签页

### 3. 登录并查看项目详情
1. 使用建筑部经理登录: `manager_arch` / `manager123`
2. 进入项目管理
3. 点击"韶谷数码城"项目的"查看详情"
4. 查看 Console 中的输出

### 4. 检查 Console 输出

应该看到以下日志：

```javascript
displayLevel2 called with data: {
  stage: "construction",
  stageAmount: 230902.26,
  chiefAmount: 24090.23,
  departmentsAmount: 206812.03,
  allocations: {
    chief: {...},
    arch: {...},
    structure: {...},
    ...
  }
}

currentUserInfo: {
  id: X,
  username: "manager_arch",
  name: "建筑部经理",
  role: "manager",
  department_id: 5,
  ...
}

Manager view - department_id: 5
```

### 5. 可能的问题和解决方案

#### 问题 A: 没有看到 console.log 输出
**原因**: `displayLevel2()` 函数没有被调用
**检查**:
- 确认空调面积表已配置
- 检查 `loadLevel2()` 是否成功执行
- 查看 Console 是否有错误信息

#### 问题 B: currentUserInfo 为 null
**原因**: 用户信息没有加载
**解决**: 
- 检查 `loadProjectDetail()` 是否正确执行
- 确认 `/api/users/me` 接口返回正常

#### 问题 C: department_id 不是 5
**原因**: 用户的部门ID不正确
**解决**:
- 检查数据库中 manager_arch 的 department_id
- 应该是 5 (建筑部)

#### 问题 D: allocations 中没有 'arch' 键
**原因**: 部门分配计算有问题
**解决**:
- 检查空调面积表配置
- 确认计算API返回正确的数据

### 6. 验证数据库

检查 manager_arch 的部门ID：

```bash
sqlite3 database.sqlite "SELECT id, username, name, role, department_id FROM users WHERE username='manager_arch';"
```

应该返回：
```
id|username|name|role|department_id
X|manager_arch|建筑部经理|manager|5
```

### 7. 测试 API

使用 curl 测试用户信息API：

```bash
# 先登录获取 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager_arch","password":"manager123"}'

# 使用返回的 token 获取用户信息
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

应该返回包含 `department_id: 5` 的用户信息。

### 8. 测试部门分配API

```bash
# 获取项目的部门分配
curl -X POST http://localhost:3000/api/air-conditioning/1/calculate-allocation \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

应该返回包含 `allocations.arch` 的数据。

## 预期结果

清除缓存并刷新后，部门经理应该看到：

```
┌─────────────────────────────────────────┐
│ 建筑部 提成分配                          │
├─────────────────────────────────────────┤
│ 分配金额              分配比例           │
│ ¥72,384.21           35.00%             │
├─────────────────────────────────────────┤
│ 项目阶段：施工图设计                     │
│ 工种奖金总额：¥206,812.03               │
└─────────────────────────────────────────┘
```

## 如果问题仍然存在

1. **完全关闭浏览器**，然后重新打开
2. **使用无痕/隐私模式**打开浏览器
3. **尝试不同的浏览器**（Chrome, Firefox, Safari）
4. **检查文件是否真的被更新**:
   ```bash
   grep -n "Manager view - department_id" public/project-detail.html
   ```
   应该能找到这行代码

5. **重启开发服务器**（虽然这是前端修改，但以防万一）

## 联系信息

如果以上步骤都无法解决问题，请提供：
1. Console 中的完整输出
2. Network 标签中的 API 请求和响应
3. 使用的浏览器和版本
4. 数据库中 manager_arch 的完整信息

---

**创建日期**: 2024年12月14日
