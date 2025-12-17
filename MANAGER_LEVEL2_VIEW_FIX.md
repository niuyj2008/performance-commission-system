# 部门经理第二级部门分配视图修复

## 需求描述
部门经理登录后进入项目详情界面，第二级的部门分配应该只显示所负责部门的提成分配数值。如果该部门没有参与提成分配，则提示没有分配。

## 实现方案
修改 `public/project-detail.html` 中的 `displayLevel2` 函数，根据用户角色显示不同的内容。

### 修改文件
`public/project-detail.html`

### 修改内容

#### 1. 在 loadProjectDetail 函数中提前加载用户信息
```javascript
async function loadProjectDetail() {
  try {
    // 获取当前用户信息（如果还没有加载）
    if (!currentUserInfo) {
      const userResponse = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        currentUserInfo = userData.user;
      }
    }
    
    // ... 其他代码
  }
}
```

#### 2. 修改 displayLevel2 函数

**添加部门ID映射**:
```javascript
// 部门ID映射（数据库ID到配置文件ID）
const deptIdMap = {
  '5': 'arch',      // 建筑部
  '6': 'structure', // 结构部
  '7': 'water',     // 给排水部
  '8': 'electric',  // 电气部
  '9': 'hvac'       // 空调部
};
```

**部门经理视图**:
- 检查用户角色是否为 `manager`
- 根据用户的 `department_id` 查找对应的部门配置ID
- 在分配数据中查找本部门的分配信息
- 如果没有分配，显示"未参与本项目的提成分配"提示
- 如果有分配，显示本部门的分配金额和比例

```javascript
if (currentUserInfo && currentUserInfo.role === 'manager' && currentUserInfo.department_id) {
  const userDeptConfigId = deptIdMap[currentUserInfo.department_id];
  const myDeptAllocation = data.allocations ? data.allocations[userDeptConfigId] : null;
  
  if (!myDeptAllocation) {
    // 显示未参与提示
    content.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
        <div>您的部门（${deptNames[userDeptConfigId]}）未参与本项目的提成分配</div>
      </div>
    `;
    return;
  }
  
  // 显示本部门的分配信息（高亮显示）
}
```

**管理员/财务视图**:
- 保持原有逻辑，显示所有部门的分配情况
- 显示项目阶段、总负责、工种奖金等汇总信息
- 显示计算明细

## 显示效果

### 部门经理视图（有分配）
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

### 部门经理视图（无分配）
```
┌─────────────────────────────────────────┐
│            📊                            │
│ 您的部门（建筑部）未参与本项目的提成分配  │
└─────────────────────────────────────────┘
```

### 管理员/财务视图
```
阶段：施工图设计 | 阶段金额：¥230,902.26
总负责：¥24,090.23 | 工种奖金：¥206,812.03

┌──────────┐ ┌──────────┐ ┌──────────┐
│ 总负责    │ │ 建筑部    │ │ 结构部    │
│ ¥24,090  │ │ ¥72,384  │ │ ¥41,362  │
│ 10.43%   │ │ 35.00%   │ │ 20.00%   │
└──────────┘ └──────────┘ └──────────┘
... (其他部门)
```

## 部门ID映射关系

| 数据库ID | 配置文件ID | 部门名称 | 经理账号 |
|---------|-----------|---------|---------|
| 5 | arch | 建筑部 | manager_arch |
| 6 | structure | 结构部 | manager_struct |
| 7 | water | 给排水部 | manager_plumb |
| 8 | electric | 电气部 | manager_elec |
| 9 | hvac | 空调部 | manager_hvac |

## 测试步骤

### 1. 测试建筑部经理（有分配）
```
1. 使用建筑部经理登录: manager_arch / manager123
2. 进入项目管理，选择"韶谷数码城"项目
3. 点击"查看详情"
4. 在第二级部门分配中，确认只显示建筑部的分配
5. 确认显示分配金额和比例
6. 确认不显示其他部门的信息
```

### 2. 测试结构部经理（有分配）
```
1. 使用结构部经理登录: manager_struct / manager123
2. 进入同一项目详情
3. 确认只显示结构部的分配
4. 确认金额和比例与建筑部不同
```

### 3. 测试部门经理（无分配）
```
1. 创建一个新项目，不配置空调面积表
2. 或创建一个项目，空调面积表中某个部门权重为0
3. 使用该部门经理登录
4. 查看项目详情
5. 确认显示"未参与本项目的提成分配"提示
```

### 4. 测试管理员视图
```
1. 使用管理员登录: admin / admin123
2. 进入项目详情
3. 确认显示所有部门的分配情况
4. 确认显示汇总信息和计算明细
```

## 权限控制

| 角色 | 第二级显示内容 |
|------|---------------|
| 管理员 | 所有部门分配 + 汇总信息 + 计算明细 |
| 财务 | 所有部门分配 + 汇总信息 + 计算明细 |
| 部门经理 | 仅本部门分配（如有）或未参与提示 |
| 普通员工 | 无权访问项目详情 |

## 技术细节

### 用户信息获取时机
- 在 `loadProjectDetail()` 函数开始时获取
- 存储在全局变量 `currentUserInfo` 中
- 供 `displayLevel2()` 和 `displayLevel3()` 使用

### 部门匹配逻辑
1. 从用户信息获取 `department_id`（数据库ID，如 5）
2. 通过 `deptIdMap` 映射到配置文件ID（如 'arch'）
3. 在分配数据 `data.allocations` 中查找对应的部门
4. 如果找到，显示分配信息；否则显示未参与提示

### 样式设计
- 部门经理视图使用蓝色高亮边框，突出显示本部门信息
- 使用大字号显示金额和比例，便于快速查看
- 简化显示内容，只保留关键信息

## 相关文件
- `public/project-detail.html` - 项目详情页面
- `server/routes/air-conditioning.js` - 部门分配计算API
- `server/config/commission-config.json` - 提成计算配置

## 注意事项
1. **部门ID一致性**: 确保数据库中的部门ID与映射表一致
2. **配置文件ID**: 部门分配使用配置文件中的ID（arch, structure等）
3. **用户信息加载**: 必须在显示第二级之前加载用户信息
4. **空调面积表**: 部门分配基于空调面积表，如果没有配置则无法计算

---

**修复日期**: 2024年12月14日
**修复人员**: Kiro AI Assistant
