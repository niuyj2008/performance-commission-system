# 部门API修复说明

## 更新日期
2024年12月14日

## 问题描述

进入员工管理界面时，显示"部门加载失败"。

## 问题原因

员工管理页面 (`public/employees.html`) 调用 `/api/users/departments` 端点来加载部门列表，但该API端点在 `server/routes/users.js` 中缺失。

## 修复内容

在 `server/routes/users.js` 中添加了部门列表API端点：

```javascript
/**
 * 获取部门列表
 * GET /api/users/departments
 */
router.get('/departments', authenticate, (req, res) => {
  db.all(
    'SELECT id, name, code, description FROM departments ORDER BY id',
    [],
    (err, departments) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ departments });
    }
  );
});
```

## API详情

### 端点
```
GET /api/users/departments
```

### 认证
需要JWT Token认证

### 响应格式
```json
{
  "departments": [
    {
      "id": 5,
      "name": "建筑部",
      "code": "ARCH",
      "description": null
    },
    {
      "id": 6,
      "name": "结构部",
      "code": "STRUCT",
      "description": null
    },
    ...
  ]
}
```

### 返回的部门列表
1. 建筑部 (ARCH)
2. 结构部 (STRUCT)
3. 给排水部 (PLUMB)
4. 电气部 (ELEC)
5. 空调部 (HVAC)

## 影响范围

此修复影响以下页面：
- **员工管理页面** (`/employees.html`) - 部门筛选下拉框
- **员工创建/编辑表单** - 部门选择下拉框

## 测试验证

### 1. 验证API响应
```bash
# 需要先获取token
curl -X GET http://localhost:3000/api/users/departments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 验证员工管理页面
1. 登录系统（使用admin账号）
2. 进入"员工管理"页面
3. 确认部门筛选下拉框正常显示5个部门
4. 点击"添加员工"
5. 确认部门选择下拉框正常显示5个部门

## 修复状态

✅ API端点已添加  
✅ 服务器已重启  
✅ 部门数据正常  
✅ 员工管理页面可以正常加载部门列表  

---

**修复完成！** 员工管理页面现在可以正常加载部门列表了。
