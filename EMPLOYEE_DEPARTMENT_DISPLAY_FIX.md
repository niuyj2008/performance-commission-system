# 员工部门显示修复说明

## 更新日期
2024年12月14日

## 问题描述

在员工管理界面中，各个部门经理的数据项没有显示所属的部门，部门列显示为"-"。

## 问题原因

员工管理页面期望从API获取 `department_name` 字段来显示部门名称，但是 `/api/users` 端点只返回了 `department_id`，没有关联查询部门表获取部门名称。

## 修复内容

修改 `server/routes/users.js` 中的用户列表查询，使用 LEFT JOIN 关联部门表：

### 修改前
```javascript
let query = 'SELECT id, username, name, role, department_id, email, phone, created_at FROM users WHERE 1=1';
```

### 修改后
```javascript
let query = `
  SELECT 
    u.id, 
    u.username, 
    u.name, 
    u.role, 
    u.department_id, 
    u.email, 
    u.phone, 
    u.created_at,
    d.name as department_name
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
  WHERE 1=1
`;
```

## 技术细节

### SQL查询说明
- 使用 `LEFT JOIN` 而不是 `INNER JOIN`，确保没有部门的用户也能显示
- 为 users 表使用别名 `u`，为 departments 表使用别名 `d`
- 添加 `d.name as department_name` 字段，前端可以直接使用

### 返回数据格式
```json
{
  "users": [
    {
      "id": 6,
      "username": "manager_arch",
      "name": "建筑部经理",
      "role": "manager",
      "department_id": 5,
      "email": null,
      "phone": null,
      "created_at": "2024-12-14 10:30:00",
      "department_name": "建筑部"
    },
    ...
  ]
}
```

## 影响范围

此修复影响：
- **员工管理页面** (`/employees.html`) - 员工列表的部门列
- 所有调用 `/api/users` 端点的功能

## 验证结果

### 部门经理账号验证
| 用户名 | 姓名 | 角色 | 部门 |
|--------|------|------|------|
| manager_arch | 建筑部经理 | manager | 建筑部 |
| manager_struct | 结构部经理 | manager | 结构部 |
| manager_plumb | 给排水部经理 | manager | 给排水部 |
| manager_elec | 电气部经理 | manager | 电气部 |
| manager_hvac | 空调部经理 | manager | 空调部 |

### 测试步骤
1. 登录系统（使用admin账号）
2. 进入"员工管理"页面
3. 查看员工列表
4. 确认所有部门经理的"部门"列正确显示部门名称
5. 确认没有部门的用户显示"-"

## 相关修复

本次修复是继 `DEPARTMENT_API_FIX.md` 之后的又一个部门相关修复：
1. **DEPARTMENT_API_FIX.md**: 添加了 `/api/users/departments` 端点，解决部门列表加载失败
2. **本次修复**: 修改了 `/api/users` 端点，添加部门名称字段，解决部门显示问题

## 修复状态

✅ SQL查询已修改  
✅ 使用LEFT JOIN关联部门表  
✅ 返回department_name字段  
✅ 服务器已重启  
✅ 数据验证通过  
✅ 员工管理页面正常显示部门名称  

---

**修复完成！** 员工管理页面现在可以正确显示每个员工所属的部门了。
