# 个人分配显示问题修复

## 问题描述
在项目详情页面的"第三级：个人分配"部分，即使部门分配已经完成，页面仍然显示"需要先完成部门分配才能进行个人分配"的提示。

## 根本原因
后端API在查询部门分配数据时，存在数据库表之间的ID映射问题：

1. `department_allocations`表中的`department_id`字段存储的是配置文件中的ID（字符串类型）：
   - 'arch' (建筑部)
   - 'structure' (结构部)
   - 'water' (给排水部)
   - 'electric' (电气部)
   - 'hvac' (空调部)
   - 'chief' (总负责)

2. `departments`表中的`id`字段是数字类型（5, 6, 7, 8, 9）

3. 原来的代码尝试直接JOIN这两个表，导致JOIN失败，返回空结果

## 修复方案
在`server/routes/personal-allocation.js`中实现了ID映射机制：

1. 创建配置ID到部门代码的映射：
   ```javascript
   const deptIdToCode = {
     'arch': 'ARCH',
     'structure': 'STRUCT',
     'water': 'PLUMB',
     'electric': 'ELEC',
     'hvac': 'HVAC',
     'chief': 'CHIEF'
   };
   ```

2. 分别查询`department_allocations`和`departments`表

3. 通过`code`字段建立映射关系

4. 在计算summary时使用数据库中的部门ID作为key

## 修复后的效果
- API正确返回部门分配汇总信息（summary）
- 前端页面能够正常显示各部门的分配情况
- 部门经理可以看到自己部门的分配额度
- 可以进行个人分配操作

## 测试结果
```bash
curl -X GET "http://localhost:3000/api/personal-allocation/2" \
  -H "Authorization: Bearer $TOKEN"
```

返回结果：
```json
{
  "allocations": [],
  "summary": {
    "5": {
      "department_name": "建筑部",
      "total": 47085.57,
      "allocated": 0,
      "remaining": 47085.57
    },
    "6": {
      "department_name": "结构部",
      "total": 45690.85,
      "allocated": 0,
      "remaining": 45690.85
    },
    ...
  }
}
```

## 注意事项
- 'chief'（总负责）在`departments`表中没有对应记录，这是正常的
- 前端使用数据库中的部门ID（数字）来匹配数据
- 后端在返回数据时已经完成了ID映射转换
