# 项目管理权限控制修复

## 问题描述
部门经理和普通员工在项目管理界面中可以看到"计算提成"、"编辑"、"删除"和"创建项目"按钮，但这些操作应该只对管理员和财务人员开放。

## 修复内容

### 1. 添加用户信息获取
在 `public/projects.html` 中添加了获取当前用户信息的功能：

```javascript
let currentUser = null; // 当前用户信息

// 获取当前用户信息
async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      
      // 根据用户角色显示/隐藏创建项目按钮
      const createBtn = document.getElementById('createProjectBtn');
      if (currentUser.role === 'admin' || currentUser.role === 'finance') {
        createBtn.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}
```

### 2. 修改页面初始化流程
修改页面加载顺序，先获取用户信息，再加载项目列表：

```javascript
// 页面初始化
async function initPage() {
  await loadCurrentUser();
  await loadProjects();
}

initPage();
```

### 3. 根据角色控制按钮显示
在项目列表渲染函数中，根据用户角色决定显示哪些按钮：

```javascript
// 根据用户角色决定显示哪些按钮
const isAdminOrFinance = currentUser && (currentUser.role === 'admin' || currentUser.role === 'finance');

html += `
  <tr>
    <td>${proj.code}</td>
    <td>${proj.name}</td>
    <td>${stageNames[proj.stage] || '-'}</td>
    <td>${proj.building_area ? proj.building_area.toLocaleString() + ' ㎡' : '-'}</td>
    <td>${proj.period || '-'}</td>
    <td>${commission}</td>
    <td>
      <div class="action-buttons">
        <button class="btn btn-primary btn-small" onclick="viewDetail(${proj.id})">查看详情</button>
        ${isAdminOrFinance ? `<button class="btn btn-success btn-small" onclick="calculateCommission(${proj.id})">计算提成</button>` : ''}
        ${isAdminOrFinance ? `<button class="btn btn-secondary btn-small" onclick="editProject(${proj.id})">编辑</button>` : ''}
        ${isAdminOrFinance ? `<button class="btn btn-danger btn-small" onclick="deleteProject(${proj.id}, '${proj.name}')">删除</button>` : ''}
      </div>
    </td>
  </tr>
`;
```

### 4. 隐藏创建项目按钮
为"创建项目"按钮添加ID，并默认隐藏，只对管理员和财务显示：

```html
<button id="createProjectBtn" class="btn btn-primary" onclick="showAddModal()" style="display: none;">创建项目</button>
```

## 权限控制规则

### 管理员 (admin) 和财务 (finance)
✅ 可以看到和使用所有按钮：
- 创建项目
- 查看详情
- 计算提成
- 编辑
- 删除

### 部门经理 (manager) 和普通员工 (employee)
✅ 只能看到：
- 查看详情

❌ 不能看到：
- 创建项目
- 计算提成
- 编辑
- 删除

## 测试步骤

### 1. 测试管理员账号
```bash
用户名: admin
密码: admin123
```
- 应该能看到所有按钮
- 可以创建、编辑、删除项目
- 可以计算提成

### 2. 测试财务账号
```bash
用户名: finance
密码: finance123
```
- 应该能看到所有按钮
- 可以创建、编辑、删除项目
- 可以计算提成

### 3. 测试部门经理账号
```bash
用户名: manager_arch
密码: manager123
```
- 只能看到"查看详情"按钮
- 不能看到"创建项目"按钮
- 不能看到"计算提成"、"编辑"、"删除"按钮

### 4. 测试普通员工账号
```bash
用户名: yuxiaohua
密码: password123
```
- 只能看到"查看详情"按钮
- 不能看到"创建项目"按钮
- 不能看到"计算提成"、"编辑"、"删除"按钮

## 注意事项

1. **前端权限控制**：这是前端的UI控制，隐藏按钮只是为了改善用户体验
2. **后端权限验证**：后端API仍然需要进行权限验证，防止直接调用API绕过前端限制
3. **一致性**：确保前端显示的权限与后端API的权限验证保持一致

## 相关文件
- `public/projects.html` - 项目管理页面（已修改）

## 系统状态
- 服务器运行在：http://localhost:3000
- 修改已生效，刷新页面即可看到效果
