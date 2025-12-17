# 部门经理员工管理权限修复

## 问题描述
当以建筑部经理（manager_arch）登录后，员工管理界面无法显示部门下的员工。

## 问题原因
`GET /api/users` 接口使用了 `requireAdminOrFinance` 中间件，该中间件只允许管理员（admin）和财务（finance）角色访问，部门经理（manager）被拒绝访问。

## 修复方案
修改用户管理相关的所有API接口，添加对部门经理角色的支持，并实现基于部门的数据隔离。

### 修改文件
`server/routes/users.js`

### 修改内容

#### 1. GET /api/users (获取用户列表)
**修改前**: 使用 `requireAdminOrFinance` 中间件，部门经理无法访问

**修改后**: 
- 移除 `requireAdminOrFinance` 中间件
- 添加角色判断逻辑：
  - **管理员/财务**: 可以查看所有员工，支持按部门筛选
  - **部门经理**: 只能查看本部门的员工
  - **普通员工**: 无权访问

```javascript
// 如果是部门经理，只能查看本部门的员工
if (currentUser.role === 'manager') {
  if (!currentUser.department_id) {
    return res.status(403).json({ error: '您没有关联的部门' });
  }
  query += ' AND u.department_id = ?';
  params.push(currentUser.department_id);
}
```

#### 2. POST /api/users (创建用户)
**修改前**: 使用 `requireAdminOrFinance` 中间件

**修改后**:
- 移除中间件，添加权限检查逻辑
- **部门经理**限制：
  - 只能创建本部门的员工
  - 只能创建普通员工角色（employee）
  - 不能创建管理员、财务或其他部门经理

```javascript
if (currentUser.role === 'manager') {
  if (department_id != currentUser.department_id) {
    return res.status(403).json({ error: '您只能添加本部门的员工' });
  }
  if (role !== 'employee') {
    return res.status(403).json({ error: '您只能添加普通员工' });
  }
}
```

#### 3. PUT /api/users/:id (更新用户)
**修改前**: 使用 `requireAdminOrFinance` 中间件

**修改后**:
- 移除中间件，添加权限检查逻辑
- 先查询目标用户信息
- **部门经理**限制：
  - 只能更新本部门的员工
  - 不能修改员工角色
  - 不能将员工转移到其他部门

```javascript
if (currentUser.role === 'manager') {
  if (targetUser.department_id != currentUser.department_id) {
    return res.status(403).json({ error: '您只能管理本部门的员工' });
  }
  if (role && role !== targetUser.role) {
    return res.status(403).json({ error: '您无权修改员工角色' });
  }
}
```

#### 4. DELETE /api/users/:id (删除用户)
**修改前**: 使用 `requireAdminOrFinance` 中间件

**修改后**:
- 移除中间件，添加权限检查逻辑
- 先查询目标用户信息
- **部门经理**限制：
  - 只能删除本部门的员工
  - 只能删除普通员工（employee）
  - 不能删除管理员、财务或部门经理

```javascript
if (currentUser.role === 'manager') {
  if (targetUser.department_id != currentUser.department_id) {
    return res.status(403).json({ error: '您只能删除本部门的员工' });
  }
  if (targetUser.role !== 'employee') {
    return res.status(403).json({ error: '您只能删除普通员工' });
  }
}
```

## 权限矩阵

| 操作 | 管理员 | 财务 | 部门经理 | 普通员工 |
|------|--------|------|----------|----------|
| 查看所有员工 | ✅ | ✅ | ❌ | ❌ |
| 查看本部门员工 | ✅ | ✅ | ✅ | ❌ |
| 创建任意角色用户 | ✅ | ✅ | ❌ | ❌ |
| 创建本部门普通员工 | ✅ | ✅ | ✅ | ❌ |
| 更新任意用户 | ✅ | ✅ | ❌ | ❌ |
| 更新本部门员工信息 | ✅ | ✅ | ✅* | ❌ |
| 删除任意用户 | ✅ | ✅ | ❌ | ❌ |
| 删除本部门普通员工 | ✅ | ✅ | ✅ | ❌ |

*部门经理更新员工时不能修改角色和部门

## 测试步骤

### 1. 测试部门经理查看员工
```
1. 使用建筑部经理登录: manager_arch / manager123
2. 进入"员工管理"页面
3. 确认能看到建筑部的员工列表
4. 确认看不到其他部门的员工
```

### 2. 测试部门经理添加员工
```
1. 点击"添加部门员工"按钮
2. 填写员工信息
3. 部门自动设置为建筑部（不可修改）
4. 角色只能选择"员工"
5. 保存后确认员工添加成功
```

### 3. 测试部门经理编辑员工
```
1. 点击本部门员工的"编辑"按钮
2. 修改员工姓名、邮箱、电话等信息
3. 确认无法修改角色和部门
4. 保存后确认更新成功
```

### 4. 测试部门经理删除员工
```
1. 点击本部门普通员工的"删除"按钮
2. 确认删除
3. 确认员工删除成功
4. 尝试删除部门经理账号（应该失败）
```

### 5. 测试权限隔离
```
1. 使用建筑部经理登录
2. 确认只能看到建筑部的员工
3. 使用结构部经理登录: manager_struct / manager123
4. 确认只能看到结构部的员工
5. 确认两个部门的数据完全隔离
```

## 数据库要求
部门经理账号必须有关联的 `department_id`，否则无法访问员工管理功能。

当前系统中的部门经理账号：
- manager_arch (建筑部, department_id: 5)
- manager_struct (结构部, department_id: 6)
- manager_plumb (给排水部, department_id: 7)
- manager_elec (电气部, department_id: 8)
- manager_hvac (空调部, department_id: 9)

## 额外修复：JWT字段名不一致

### 问题
修复后仍然显示"您没有关联的部门"错误。

### 原因
JWT token 中使用 `departmentId`（camelCase），但代码中检查 `currentUser.department_id`（snake_case）。

### 解决方案
将所有 `currentUser.department_id` 改为 `currentUser.departmentId`，与JWT token字段名保持一致。

## 修复状态
✅ 已修复并测试
✅ 服务器已重启 (进程ID: 60)
✅ 功能正常工作
✅ 权限隔离正确实现
✅ JWT字段名一致性问题已解决

## 相关文件
- `server/routes/users.js` - 用户管理API路由
- `server/middleware/auth.js` - 认证中间件
- `public/employees.html` - 员工管理前端页面

## 安全考虑
1. **数据隔离**: 部门经理只能访问本部门数据，无法跨部门操作
2. **角色限制**: 部门经理只能管理普通员工，不能创建或修改管理角色
3. **部门锁定**: 部门经理不能将员工转移到其他部门
4. **权限验证**: 每个操作都进行严格的权限检查

---

**修复日期**: 2024年12月14日
**修复人员**: Kiro AI Assistant
