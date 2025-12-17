# 第三级个人分配功能设计文档

## Overview

第三级个人分配功能允许部门经理为项目分配本部门的参与人员，并为每个人员分配具体的提成金额。系统将确保分配总额不超过部门的提成总额，并提供权限控制确保部门经理只能管理本部门的分配。

## Architecture

### 系统架构
```
前端 (project-detail.html)
  ↓
API层 (personal-allocation.js)
  ↓
数据访问层 (employee_distributions表)
  ↓
数据库 (SQLite)
```

### 权限模型
- **管理员**: 可以查看所有部门的个人分配
- **部门经理**: 只能查看和管理本部门的个人分配
- **员工**: 只能查看自己的分配（未来功能）

## Components and Interfaces

### 1. 前端组件

#### Level3 Display Component
- **位置**: `public/project-detail.html`
- **功能**: 显示个人分配界面
- **状态**:
  - 未分配：显示"分配参与人员"按钮
  - 已分配：显示参与人员列表和分配金额
  - 编辑模式：允许修改分配

#### Personal Allocation Modal
- **功能**: 弹出式分配界面
- **包含**:
  - 部门分配总额显示
  - 员工选择列表（多选）
  - 金额输入框
  - 实时计算剩余金额
  - 保存/取消按钮

### 2. 后端API

#### GET /api/personal-allocation/:projectId
- **功能**: 获取项目的个人分配
- **权限**: 
  - 管理员：返回所有部门的分配
  - 部门经理：只返回本部门的分配
- **响应**: 
```json
{
  "allocations": [
    {
      "id": 1,
      "employee_id": 10,
      "employee_name": "张三",
      "department_id": 5,
      "department_name": "建筑部",
      "amount": 5000,
      "created_at": "2024-12-14"
    }
  ],
  "summary": {
    "department_total": 72384.21,
    "allocated": 50000,
    "remaining": 22384.21
  }
}
```

#### POST /api/personal-allocation/:projectId
- **功能**: 创建或更新个人分配
- **权限**: 管理员或部门经理
- **请求体**:
```json
{
  "allocations": [
    {
      "employee_id": 10,
      "amount": 5000
    }
  ]
}
```

#### DELETE /api/personal-allocation/:projectId/:employeeId
- **功能**: 删除个人分配
- **权限**: 管理员或部门经理（仅本部门）

## Data Models

### employee_distributions 表（已存在）
```sql
CREATE TABLE employee_distributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  department_id TEXT NOT NULL,
  employee_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, department_id, employee_id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (employee_id) REFERENCES users(id)
);
```

**注意**: 需要修改 `department_id` 字段类型从 TEXT 改为 INTEGER

## Error Handling

### 验证规则
1. **金额验证**: amount > 0
2. **总额验证**: SUM(allocations) <= department_total
3. **权限验证**: 部门经理只能分配本部门员工
4. **员工验证**: 员工必须属于该部门
5. **唯一性验证**: 同一项目同一员工只能有一条分配记录

### 错误消息
- "分配金额必须大于0"
- "分配总额超出部门限额，超出金额：¥X"
- "您没有权限分配其他部门的员工"
- "该员工不属于您的部门"
- "该员工已经分配过提成"

## Testing Strategy

### 单元测试
- 测试金额验证逻辑
- 测试权限检查逻辑
- 测试总额计算逻辑

### 集成测试
- 测试完整的分配流程
- 测试跨部门权限隔离
- 测试数据一致性



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Allocation Sum Constraint
*For any* project and department, the sum of all personal allocations for that department should never exceed the department's total allocation from Level 2.
**Validates: Requirements 3.2, 6.2**

### Property 2: Department Isolation
*For any* department manager, all personal allocations they create should only include employees from their own department.
**Validates: Requirements 2.4, 3.4**

### Property 3: Positive Amount
*For any* personal allocation, the amount should always be greater than zero.
**Validates: Requirements 3.1**

### Property 4: Unique Employee Per Project
*For any* project and employee, there should be at most one personal allocation record.
**Validates: Requirements 3.4**

### Property 5: Remaining Amount Accuracy
*For any* department allocation, the remaining amount should equal the department total minus the sum of all personal allocations.
**Validates: Requirements 6.3**

## Implementation Plan

### Phase 1: Backend API (Core)
1. 创建个人分配API路由文件
2. 实现获取个人分配接口（带权限控制）
3. 实现创建/更新个人分配接口
4. 实现删除个人分配接口
5. 添加数据验证逻辑

### Phase 2: Frontend UI
1. 在项目详情页添加第三级加载逻辑
2. 创建个人分配模态框
3. 实现员工选择功能
4. 实现金额输入和验证
5. 实现实时剩余金额计算
6. 实现保存和删除功能

### Phase 3: Permission & Validation
1. 实现部门经理权限检查
2. 实现金额总和验证
3. 实现员工部门验证
4. 添加错误提示

### Phase 4: Testing & Polish
1. 测试完整流程
2. 测试权限隔离
3. 优化用户体验
4. 添加加载状态提示

## UI/UX Design

### 管理员视图
- 显示所有部门的个人分配
- 按部门分组展示
- 显示每个部门的分配进度

### 部门经理视图
- 只显示本部门的分配情况
- 显示部门总额、已分配、剩余金额
- 提供"分配参与人员"按钮
- 显示参与人员列表和金额

### 分配模态框
```
┌─────────────────────────────────────┐
│  分配参与人员 - 建筑部              │
├─────────────────────────────────────┤
│  部门总额: ¥72,384.21               │
│  已分配: ¥50,000.00                 │
│  剩余: ¥22,384.21                   │
├─────────────────────────────────────┤
│  ☑ 张三    [5000.00]  [删除]       │
│  ☑ 李四    [8000.00]  [删除]       │
│  ☐ 王五    [      ]   [添加]       │
│  ☐ 赵六    [      ]   [添加]       │
├─────────────────────────────────────┤
│  [取消]              [保存]         │
└─────────────────────────────────────┘
```

## Security Considerations

1. **权限验证**: 每个API调用都必须验证用户权限
2. **数据隔离**: 部门经理只能访问本部门数据
3. **输入验证**: 所有用户输入必须验证
4. **SQL注入防护**: 使用参数化查询
5. **审计日志**: 记录所有分配操作（未来功能）

## Performance Considerations

1. **查询优化**: 使用索引优化查询性能
2. **缓存策略**: 缓存部门分配总额
3. **批量操作**: 支持批量保存分配
4. **分页**: 如果员工数量很多，考虑分页

## Future Enhancements

1. **工作量系数**: 根据工作量自动计算分配比例
2. **审批流程**: 添加分配审批机制
3. **锁定功能**: 分配确认后锁定，防止修改
4. **历史记录**: 查看分配变更历史
5. **导出功能**: 导出分配明细到Excel
6. **通知功能**: 分配完成后通知员工
