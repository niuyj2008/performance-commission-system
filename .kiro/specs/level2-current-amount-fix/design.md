# 第二级部门分配"当期发放金额"显示修复 - 设计文档

## 问题根因分析

经过代码审查,发现**当期发放金额的计算逻辑本身是正确的**,但可能存在以下问题:

### 1. 数据源问题

**问题**: `myDeptAllocation.amount`的值可能不是预期的值

**原因**: 
- 后端API `/api/air-conditioning/:projectId/calculate-allocation`返回的是**阶段金额**
- 例如:施工图阶段(85%)的部门分配金额
- 但这个金额可能与数据库中`department_commissions`表的金额不一致

**验证方法**:
```javascript
console.log('部门分配数据:', myDeptAllocation);
console.log('部门总额:', totalAmount);
console.log('本期比例:', currentRatio);
console.log('当期发放:', currentAmount);
```

### 2. 发放节点选择问题

**问题**: `selectedPaymentStage`可能未正确初始化

**当前逻辑**:
```javascript
// 如果没有选择发放节点，默认选择最新的
if (!selectedPaymentStage && paymentStages.length > 0) {
  selectedPaymentStage = paymentStages[paymentStages.length - 1];
}
```

**问题**: 
- 部门经理首次进入页面时,`paymentStages`可能还未加载
- 导致`selectedPaymentStage`为`null`
- `currentRatio`计算时使用默认值1,导致显示错误

### 3. 数据加载顺序问题

**当前加载顺序**:
1. `loadProjectDetail()` - 加载项目信息
2. `calculateLevel1()` - 计算第一级
3. `loadLevel2()` - 加载第二级
4. `loadPaymentStages()` - 加载发放节点(在`displayLevel1`中调用)

**问题**: 
- `loadLevel2()`可能在`loadPaymentStages()`之前执行
- 导致`paymentStages`数组为空
- `selectedPaymentStage`为`null`

### 4. 部门ID映射问题

**问题**: 部门经理的`department_id`与配置文件中的部门ID不匹配

**数据库ID** → **配置文件ID**:
- 5 → arch (建筑部)
- 6 → structure (结构部)
- 7 → water (给排水部)
- 8 → electric (电气部)
- 9 → hvac (空调部)

**当前代码**:
```javascript
const userDeptConfigId = deptIdMap[currentUserInfo.department_id];
```

**问题**: 如果`deptIdMap`映射错误,会找不到部门分配数据

## 修复方案

### 方案1: 修复数据加载顺序(推荐)

**目标**: 确保发放节点数据在显示第二级之前加载完成

**实现**:
```javascript
async function loadProjectDetail() {
  try {
    // 1. 加载用户信息
    if (!currentUserInfo) {
      const userResponse = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        currentUserInfo = userData.user;
      }
    }
    
    // 2. 加载项目基本信息
    const response = await fetch(`${API_BASE}/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('加载项目失败');
    
    const data = await response.json();
    projectData = data.project;
    
    document.getElementById('projectName').textContent = projectData.name;
    document.getElementById('projectCode').textContent = `项目编号：${projectData.code}`;
    
    // 3. 计算第一级提成
    await calculateLevel1();
    
    // 4. 加载发放节点(必须在第二级之前)
    const isAdminOrFinance = currentUserInfo && (currentUserInfo.role === 'admin' || currentUserInfo.role === 'finance');
    if (isAdminOrFinance) {
      await loadPaymentStages();
    } else {
      // 部门经理也需要加载发放节点数据
      await loadPaymentStagesForManager();
    }
    
    // 5. 加载第二级部门分配(此时发放节点已加载)
    await loadLevel2();
    
    // 6. 加载第三级个人分配
    await loadLevel3();
    
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// 为部门经理加载发放节点(不显示在界面上,仅用于计算)
async function loadPaymentStagesForManager() {
  try {
    const response = await fetch(`${API_BASE}/payment-stages/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('加载发放节点失败');
    
    const data = await response.json();
    paymentStages = data.stages || [];
    projectTotalPaid = data.total_paid_amount || 0;
    projectTotalPaidByDept = data.total_paid_by_department || {};
    
    // 默认选择最新的发放节点
    if (paymentStages.length > 0 && !selectedPaymentStage) {
      selectedPaymentStage = paymentStages[paymentStages.length - 1];
    }
  } catch (error) {
    console.error('加载发放节点失败:', error);
    // 如果没有发放节点,使用默认值
    paymentStages = [];
    selectedPaymentStage = null;
  }
}
```

### 方案2: 添加默认发放节点处理

**目标**: 当没有配置发放节点时,使用合理的默认值

**实现**:
```javascript
function displayLevel2(data) {
  const content = document.getElementById('level2Content');
  
  // ... 部门名称映射等代码 ...
  
  // 计算当期比例
  let currentRatio = 1;  // 默认100%
  let currentStageName = '全额';
  
  if (selectedPaymentStage) {
    currentRatio = selectedPaymentStage.current_ratio;
    currentStageName = `${selectedPaymentStage.stage_name} ${(currentRatio * 100).toFixed(1)}%`;
  } else if (paymentStages.length > 0) {
    // 如果有发放节点但未选择,使用最新的
    selectedPaymentStage = paymentStages[paymentStages.length - 1];
    currentRatio = selectedPaymentStage.current_ratio;
    currentStageName = `${selectedPaymentStage.stage_name} ${(currentRatio * 100).toFixed(1)}%`;
  }
  
  // 部门经理视图
  if (currentUserInfo && currentUserInfo.role === 'manager' && currentUserInfo.department_id) {
    const userDeptConfigId = deptIdMap[currentUserInfo.department_id];
    
    if (!userDeptConfigId) {
      content.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
          <div>您的部门信息配置有误</div>
          <div style="font-size: 13px; color: #999; margin-top: 10px;">
            部门ID: ${currentUserInfo.department_id}
          </div>
        </div>
      `;
      return;
    }
    
    const myDeptAllocation = data.allocations ? data.allocations[userDeptConfigId] : null;
    
    if (!myDeptAllocation) {
      content.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
          <div>您的部门（${deptNames[userDeptConfigId]}）未参与本项目的提成分配</div>
        </div>
      `;
      return;
    }
    
    const deptName = deptNames[userDeptConfigId];
    const totalAmount = myDeptAllocation.amount;
    const currentAmount = totalAmount * currentRatio;
    
    // 获取已发放金额
    let paidAmount = 0;
    if (selectedPaymentStage && selectedPaymentStage.paid_by_department) {
      paidAmount = selectedPaymentStage.paid_by_department[currentUserInfo.department_id] || 0;
    }
    const remainingAmount = currentAmount - paidAmount;
    
    let html = `
      <div style="margin-bottom: 20px; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 2px solid #1890ff;">
        <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px;">
          ${deptName} 提成分配
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: ${paidAmount > 0 ? '15px' : '0'};">
          <div>
            <div style="font-size: 13px; color: #666; margin-bottom: 5px;">总分配金额</div>
            <div style="font-size: 28px; font-weight: 600; color: #666;">
              ¥${totalAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <div style="font-size: 13px; color: #666; margin-bottom: 5px;">
              当期发放 (${currentStageName})
            </div>
            <div style="font-size: 28px; font-weight: 600; color: #1890ff;">
              ¥${currentAmount.toLocaleString()}
            </div>
          </div>
        </div>
        ${paidAmount > 0 ? `
          <div style="padding-top: 15px; border-top: 1px dashed #91d5ff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="font-size: 13px; color: #666; margin-bottom: 5px;">已发放</div>
                <div style="font-size: 24px; font-weight: 600; color: #52c41a;">
                  ¥${paidAmount.toLocaleString()}
                </div>
              </div>
              <div>
                <div style="font-size: 13px; color: #666; margin-bottom: 5px;">剩余可发放</div>
                <div style="font-size: 24px; font-weight: 600; color: ${remainingAmount < 0 ? '#ff4d4f' : '#faad14'};">
                  ¥${remainingAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div style="padding: 15px; background: #fafafa; border-radius: 8px;">
        <div style="font-size: 14px; color: #666;">
          项目阶段：${data.stage === 'scheme' ? '方案设计' : '施工图设计'}
        </div>
        ${!selectedPaymentStage ? `
          <div style="font-size: 13px; color: #fa8c16; margin-top: 10px;">
            ⚠️ 未配置发放节点,显示全额分配
          </div>
        ` : ''}
      </div>
    `;
    
    content.innerHTML = html;
    return;
  }
  
  // ... 管理员视图代码 ...
}
```

### 方案3: 添加调试信息

**目标**: 帮助用户和开发者快速定位问题

**实现**:
```javascript
function displayLevel2(data) {
  // 添加调试日志
  console.group('第二级部门分配 - 调试信息');
  console.log('当前用户:', currentUserInfo);
  console.log('部门分配数据:', data);
  console.log('发放节点列表:', paymentStages);
  console.log('选中的发放节点:', selectedPaymentStage);
  
  if (currentUserInfo && currentUserInfo.role === 'manager') {
    const userDeptConfigId = deptIdMap[currentUserInfo.department_id];
    console.log('部门ID映射:', {
      数据库ID: currentUserInfo.department_id,
      配置ID: userDeptConfigId,
      部门名称: deptNames[userDeptConfigId]
    });
    
    const myDeptAllocation = data.allocations ? data.allocations[userDeptConfigId] : null;
    if (myDeptAllocation) {
      const currentRatio = selectedPaymentStage ? selectedPaymentStage.current_ratio : 1;
      console.log('金额计算:', {
        部门总额: myDeptAllocation.amount,
        本期比例: currentRatio,
        当期发放: myDeptAllocation.amount * currentRatio
      });
    }
  }
  
  console.groupEnd();
  
  // ... 原有显示逻辑 ...
}
```

## 实施步骤

1. **立即修复**: 实施方案1,确保数据加载顺序正确
2. **增强健壮性**: 实施方案2,添加默认值处理
3. **便于调试**: 实施方案3,添加调试信息(可选,生产环境可移除)

## 测试计划

### 测试场景1: 有发放节点的项目

1. 以部门经理身份登录
2. 进入有发放节点的项目
3. 验证当期发放金额 = 部门总额 × 本期比例
4. 切换发放节点,验证金额更新

### 测试场景2: 无发放节点的项目

1. 以部门经理身份登录
2. 进入无发放节点的项目
3. 验证显示全额分配(100%)
4. 验证有提示信息

### 测试场景3: 多个发放节点

1. 以部门经理身份登录
2. 进入有多个发放节点的项目
3. 验证默认选择最新节点
4. 验证金额计算正确

### 测试场景4: 有已发放金额

1. 以部门经理身份登录
2. 进入有已发放记录的项目
3. 验证显示: 当期发放、已发放、剩余
4. 验证剩余 = 当期发放 - 已发放

## 预期结果

修复后,部门经理应该能看到:

```
建筑部 提成分配

总分配金额              当期发放 (施工图 10.0%)
¥72,384.21             ¥7,238.42

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

已发放                  剩余可发放
¥5,000.00              ¥2,238.42
```

计算验证:
- 部门总额: ¥72,384.21
- 本期比例: 10%
- 当期发放: ¥72,384.21 × 10% = ¥7,238.42 ✅
- 已发放: ¥5,000.00
- 剩余: ¥7,238.42 - ¥5,000.00 = ¥2,238.42 ✅

