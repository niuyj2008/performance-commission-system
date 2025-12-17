# 跨部门个人分配功能实现

## 需求描述
允许管理员、财务和部门经理在第三级个人分配中跨部门分配员工，不再限制只能分配本部门的员工。

## 修改内容

### 1. 前端修改 (public/project-detail.html)

#### 1.1 加载所有员工
修改 `loadDepartmentEmployees` 函数，所有角色都可以加载全部员工：

```javascript
async function loadDepartmentEmployees(deptId) {
  try {
    // 所有角色都可以加载所有员工（支持跨部门分配）
    const response = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('加载员工失败');
    
    const data = await response.json();
    departmentEmployees = data.users || [];
    // ...
  }
}
```

#### 1.2 按部门分组显示
修改 `renderEmployeeList` 函数，所有角色都按部门分组显示员工列表：

```javascript
function renderEmployeeList() {
  // 所有角色都按部门分组显示
  const employeesByDept = {};
  departmentEmployees.forEach(emp => {
    const deptName = emp.department_name || '未分配部门';
    if (!employeesByDept[deptName]) {
      employeesByDept[deptName] = [];
    }
    employeesByDept[deptName].push(emp);
  });
  
  // 渲染每个部门的员工...
}
```

#### 1.3 更新模态框标题
将模态框标题改为"分配参与人员（可跨部门）"，明确告知用户可以跨部门分配。

### 2. 后端修改

#### 2.1 用户列表API (server/routes/users.js)
移除部门经理的部门限制，允许查看所有员工：

```javascript
// 普通员工无权访问用户列表
if (currentUser.role === 'employee') {
  return res.status(403).json({ error: '权限不足' });
}

// 管理员、财务、部门经理都可以查看所有员工（支持跨部门分配）
```

**修改前**：
- 部门经理只能查看本部门员工
- 需要验证部门ID

**修改后**：
- 部门经理可以查看所有员工
- 只限制普通员工访问

#### 2.2 个人分配保存API (server/routes/personal-allocation.js)
移除部门经理的跨部门限制：

```javascript
// 所有角色（管理员、财务、部门经理）都可以跨部门分配
// 不再限制部门经理只能分配本部门员工
```

**修改前**：
```javascript
if (currentUser.role === 'manager') {
  if (!currentUser.department_id) {
    return res.status(403).json({ error: '您没有关联的部门' });
  }
  if (employee.department_id !== currentUser.department_id) {
    return res.status(403).json({ error: `员工 ${employee.name} 不属于您的部门` });
  }
}
```

**修改后**：
- 移除了部门验证逻辑
- 所有角色都可以分配任意部门的员工

### 3. 部门限额验证保留
虽然允许跨部门分配，但仍然保留每个部门的分配限额验证：

```javascript
// 验证部门分配总额
// 按部门分组验证（管理员和财务可能跨部门分配）
const allocationsByDept = {};
for (const alloc of allocations) {
  const employee = await new Promise((resolve, reject) => {
    db.get('SELECT department_id FROM users WHERE id = ?', [alloc.employee_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (employee && employee.department_id) {
    if (!allocationsByDept[employee.department_id]) {
      allocationsByDept[employee.department_id] = [];
    }
    allocationsByDept[employee.department_id].push(alloc);
  }
}

// 验证每个部门的分配总额不超过部门限额
for (const [deptId, deptAllocations] of Object.entries(allocationsByDept)) {
  // 验证逻辑...
}
```

这确保了：
- 每个部门的员工分配总额不会超过该部门的分配限额
- 跨部门分配时，系统会自动按员工所属部门进行限额验证

## 功能特性

### 管理员和财务
✅ 可以查看所有部门的员工
✅ 可以为任意部门的员工分配提成
✅ 员工列表按部门分组显示
✅ 自动验证每个部门的分配限额

### 部门经理
✅ 可以查看所有部门的员工（不再限制只看本部门）
✅ 可以为任意部门的员工分配提成
✅ 员工列表按部门分组显示
✅ 自动验证每个部门的分配限额

### 普通员工
❌ 无权访问用户列表
❌ 无权进行个人分配

## 使用场景

### 场景1：跨部门项目协作
当一个项目需要多个部门协作时，部门经理可以：
1. 打开个人分配模态框
2. 看到所有部门的员工列表（按部门分组）
3. 为参与项目的任意部门员工分配提成
4. 系统自动验证每个部门的分配限额

### 场景2：灵活的人员调配
当员工临时支援其他部门项目时：
1. 任何部门经理都可以为该员工分配提成
2. 不需要先调整员工的部门归属
3. 提成会计入员工实际所属部门的限额

## 测试步骤

### 1. 测试部门经理跨部门分配
```bash
# 登录建筑部经理
用户名: manager_arch
密码: manager123

# 操作步骤：
1. 进入项目详情页面
2. 点击"分配参与人员"按钮
3. 应该能看到所有部门的员工（按部门分组）
4. 可以为任意部门的员工输入分配金额
5. 点击保存，应该成功保存
```

### 2. 验证部门限额
```bash
# 测试超出部门限额的情况
1. 为某个部门的员工分配总额超过该部门限额
2. 点击保存
3. 应该收到错误提示："分配总额超出部门限额"
```

### 3. 验证员工列表显示
```bash
# 检查员工列表分组
1. 打开个人分配模态框
2. 应该看到员工按部门分组显示
3. 每个部门显示部门名称和员工数量
4. 员工信息包括姓名和用户名
```

## 注意事项

1. **权限控制**：
   - 只有管理员、财务和部门经理可以进行个人分配
   - 普通员工无权访问

2. **限额验证**：
   - 系统会自动按员工所属部门验证分配限额
   - 跨部门分配时，每个部门的限额独立验证

3. **数据一致性**：
   - 员工的部门归属不会因为跨部门分配而改变
   - 提成记录会正确关联到员工实际所属的部门

4. **用户体验**：
   - 员工列表按部门分组，便于查找
   - 模态框标题明确提示"可跨部门"
   - 已分配的员工会高亮显示（绿色背景）

## 相关文件
- `public/project-detail.html` - 项目详情页面（前端）
- `server/routes/users.js` - 用户管理API（后端）
- `server/routes/personal-allocation.js` - 个人分配API（后端）

## 系统状态
- 服务器运行在：http://localhost:3000
- 修改已生效，刷新页面即可使用跨部门分配功能
