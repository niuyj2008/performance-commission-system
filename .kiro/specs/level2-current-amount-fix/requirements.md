# 第二级部门分配"当期发放金额"显示修复 - 需求文档

## 问题描述

部门经理登录后,在"第二级:部门分配"页面中,显示的**当期发放金额不正确**。

### 当前错误的计算逻辑

```javascript
const totalAmount = myDeptAllocation.amount;  // 部门总分配金额
const currentAmount = totalAmount * currentRatio;  // ❌ 错误计算
```

### 问题分析

1. **`myDeptAllocation.amount`的含义不明确**
   - 这个金额来自`calculateDepartmentAllocation` API
   - 它是基于**某个设计阶段**(方案15% 或 施工图85%)计算出的部门分配金额
   - 不是整个项目周期的部门总额

2. **发放节点的`current_ratio`含义**
   - `current_ratio`: 本期发放比例(例如10%)
   - `total_ratio`: 累计发放比例(例如90%)
   - `previous_ratio`: 上期累计比例(例如80%)

3. **正确的理解**
   - 项目总提成 = ¥100,000
   - 施工图阶段金额 = ¥100,000 × 85% = ¥85,000
   - 建筑部分配(33.76%) = ¥85,000 × 33.76% = ¥28,696
   - **当期发放(10%)** = ¥28,696 × 10% = ¥2,869.6 ❌ **这是错误的!**

4. **正确的计算应该是**
   - 项目总提成 = ¥100,000
   - 本期发放比例 = 10%
   - **本期项目发放总额** = ¥100,000 × 10% = ¥10,000
   - 施工图阶段占比 = 85%
   - 本期施工图阶段金额 = ¥10,000 × 85% = ¥8,500
   - 建筑部当期发放 = ¥8,500 × 33.76% = ¥2,869.6 ✅

   **或者更简单的理解:**
   - 建筑部总分配 = ¥28,696 (这是施工图阶段的总额)
   - 本期发放比例 = 10%
   - 建筑部当期发放 = ¥28,696 × 10% = ¥2,869.6

### 实际问题

查看代码后发现,**当前的计算逻辑其实是正确的**!

```javascript
const totalAmount = myDeptAllocation.amount;  // 部门在该阶段的总分配
const currentAmount = totalAmount * currentRatio;  // 当期发放 = 部门总额 × 本期比例
```

**那么问题出在哪里?**

可能的原因:
1. **`myDeptAllocation.amount`的值不正确** - 需要检查后端计算
2. **`currentRatio`的值不正确** - 需要检查发放节点数据
3. **显示的数字格式问题** - 需要检查前端显示逻辑
4. **数据库中的部门分配数据有误** - 需要检查导入的数据

## 用户故事

### 用户故事 1: 部门经理查看当期发放金额

**作为** 部门经理  
**我想要** 在第二级部门分配页面看到正确的当期发放金额  
**以便** 我能准确了解本部门在当前发放节点可以分配给员工的金额

#### 验收标准

1. WHEN 部门经理登录并进入项目详情页 THEN 系统应显示第二级部门分配信息
2. WHEN 选择了某个发放节点 THEN 系统应正确计算并显示当期发放金额
3. WHEN 显示当期发放金额时 THEN 计算公式应为: 部门总分配金额 × 本期发放比例
4. WHEN 显示当期发放金额时 THEN 应同时显示发放节点名称和本期比例
5. WHEN 部门有已发放金额时 THEN 应显示: 当期发放金额、已发放、剩余可发放

### 用户故事 2: 管理员查看所有部门的当期发放金额

**作为** 管理员或财务人员  
**我想要** 查看所有部门的当期发放金额  
**以便** 我能全局掌握各部门的发放情况

#### 验收标准

1. WHEN 管理员进入项目详情页 THEN 系统应显示所有部门的分配信息
2. WHEN 选择发放节点时 THEN 所有部门的当期发放金额应同步更新
3. WHEN 显示部门卡片时 THEN 应清晰区分: 总额、当期发放、已发放、剩余
4. WHEN 计算当期发放金额时 THEN 应使用统一的计算逻辑

## 技术要求

### 数据流

1. **后端API**: `/api/air-conditioning/:projectId/calculate-allocation`
   - 返回: `allocations[deptId].amount` - 部门在该阶段的总分配金额

2. **后端API**: `/api/payment-stages/:projectId`
   - 返回: `stages[].current_ratio` - 本期发放比例
   - 返回: `stages[].paid_by_department[deptId]` - 该部门在该节点的已发放金额

3. **前端计算**:
   ```javascript
   const totalAmount = allocation.amount;  // 部门总分配
   const currentRatio = selectedPaymentStage.current_ratio;  // 本期比例
   const currentAmount = totalAmount * currentRatio;  // 当期发放
   const paidAmount = selectedPaymentStage.paid_by_department[deptId] || 0;  // 已发放
   const remainingAmount = currentAmount - paidAmount;  // 剩余
   ```

### 需要验证的数据

1. **部门分配金额** (`department_commissions`表)
   - 检查导入的数据是否正确
   - 验证计算逻辑是否正确

2. **发放节点数据** (`payment_stages`表)
   - 检查`current_ratio`是否正确
   - 验证发放节点是否正确关联到项目

3. **已发放金额** (`employee_distributions`表)
   - 检查是否正确关联到发放节点
   - 验证按部门汇总的逻辑

## 调试步骤

1. **检查数据库数据**
   ```sql
   -- 查看项目的部门分配
   SELECT * FROM department_commissions WHERE project_id = ?;
   
   -- 查看发放节点
   SELECT * FROM payment_stages WHERE project_id = ?;
   
   -- 查看员工分配
   SELECT * FROM employee_distributions WHERE project_id = ?;
   ```

2. **检查API返回值**
   - 在浏览器控制台查看`loadLevel2()`的返回数据
   - 检查`allocations[deptId].amount`的值
   - 检查`selectedPaymentStage.current_ratio`的值

3. **检查前端计算**
   - 在`displayLevel2()`函数中添加`console.log`
   - 验证`currentAmount`的计算结果

## 预期修复方案

根据问题的实际原因,可能需要:

1. **如果是数据问题**: 修复导入脚本或手动更新数据库
2. **如果是计算逻辑问题**: 修改后端API的计算逻辑
3. **如果是显示问题**: 修改前端的显示逻辑
4. **如果是理解问题**: 更新文档说明计算规则

## 成功标准

1. ✅ 部门经理能看到正确的当期发放金额
2. ✅ 当期发放金额 = 部门总分配 × 本期比例
3. ✅ 显示清晰,包含: 总额、当期发放、已发放、剩余
4. ✅ 所有角色(部门经理、管理员、财务)看到的数据一致
5. ✅ 切换发放节点时,当期发放金额正确更新

