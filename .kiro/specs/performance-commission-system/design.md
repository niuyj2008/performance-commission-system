# 设计文档

## 概述

绩效提成分配管理系统是一个基于Web的应用程序，部署在字节扣子平台上。系统采用前后端分离架构，使用现代Web技术栈构建，为建筑设计公司提供自动化的提成计算和分配管理功能。

系统的核心功能包括：
- 基于建筑属性的提成总额自动计算
- 基于空调面积表的部门间分配比例计算
- 部门内部灵活的提成分配
- 项目追加的增量计算
- 半年度提成汇总和报表生成
- Excel数据的导入导出

## 架构

### 系统架构

系统采用三层架构：

```
┌─────────────────────────────────────────┐
│          表现层 (Presentation)           │
│    Web前端 (React/Vue + Ant Design)     │
└─────────────────────────────────────────┘
                    ↓ HTTP/REST API
┌─────────────────────────────────────────┐
│           业务逻辑层 (Business)          │
│   - 用户认证与权限控制                   │
│   - 提成计算引擎                         │
│   - 部门分配计算                         │
│   - 数据导入导出处理                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          数据访问层 (Data Access)        │
│   - 项目数据管理                         │
│   - 用户和权限管理                       │
│   - 计算公式配置                         │
│   - 发放记录管理                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            数据存储 (Storage)            │
│   关系型数据库 (MySQL/PostgreSQL)        │
│   文件存储 (Excel文件、附件)             │
└─────────────────────────────────────────┘
```

### 技术栈

**前端：**
- 框架：React 或 Vue.js
- UI组件库：Ant Design
- 状态管理：Redux/Vuex
- Excel处理：SheetJS (xlsx)
- 图表：ECharts 或 Chart.js

**后端：**
- 运行环境：Node.js
- Web框架：Express 或 Koa
- ORM：Sequelize 或 TypeORM
- 认证：JWT (JSON Web Token)
- Excel处理：ExcelJS

**数据库：**
- 关系型数据库：MySQL 或 PostgreSQL
- 缓存：Redis (可选)

**部署：**
- 平台：字节扣子平台
- 容器化：Docker (如果平台支持)

## 组件和接口

### 核心组件

#### 1. 用户认证与权限模块 (AuthModule)

**职责：**
- 用户登录认证
- 角色权限管理
- 访问控制

**接口：**
```typescript
interface AuthModule {
  // 用户登录
  login(username: string, password: string): Promise<AuthToken>
  
  // 验证令牌
  verifyToken(token: string): Promise<User>
  
  // 检查权限
  checkPermission(user: User, resource: string, action: string): boolean
  
  // 获取用户角色
  getUserRole(userId: string): Promise<Role>
}
```

#### 2. 项目管理模块 (ProjectModule)

**职责：**
- 项目信息的增删改查
- 项目追加管理
- 项目状态跟踪

**接口：**
```typescript
interface ProjectModule {
  // 创建项目
  createProject(project: ProjectInput): Promise<Project>
  
  // 更新项目
  updateProject(projectId: string, updates: Partial<ProjectInput>): Promise<Project>
  
  // 查询项目
  getProject(projectId: string): Promise<Project>
  
  // 列出项目
  listProjects(filter: ProjectFilter): Promise<Project[]>
  
  // 添加项目追加
  addProjectAddition(projectId: string, addition: ProjectAddition): Promise<Project>
  
  // 获取项目历史
  getProjectHistory(projectId: string): Promise<ProjectHistory[]>
}
```

#### 3. 提成计算引擎 (CommissionCalculator)

**职责：**
- 基于建筑属性计算提成总额
- 应用计算公式
- 处理项目追加的增量计算

**接口：**
```typescript
interface CommissionCalculator {
  // 计算项目提成总额
  calculateTotalCommission(project: Project, formula: CalculationFormula): Promise<number>
  
  // 计算追加提成
  calculateAdditionCommission(
    project: Project, 
    addition: ProjectAddition,
    alreadyPaid: number
  ): Promise<number>
  
  // 验证计算结果
  validateCalculation(calculation: CalculationResult): boolean
}
```

#### 4. 空调面积表模块 (AirConditioningModule)

**职责：**
- 管理项目的空调面积数据
- 验证空调面积表完整性

**接口：**
```typescript
interface AirConditioningModule {
  // 保存空调面积表
  saveAirConditioningTable(projectId: string, table: AirConditioningTable): Promise<void>
  
  // 获取空调面积表
  getAirConditioningTable(projectId: string): Promise<AirConditioningTable>
  
  // 更新空调面积表
  updateAirConditioningTable(
    projectId: string, 
    updates: Partial<AirConditioningTable>
  ): Promise<AirConditioningTable>
  
  // 验证空调面积表
  validateTable(table: AirConditioningTable): ValidationResult
}
```

#### 5. 部门分配计算器 (DepartmentAllocator)

**职责：**
- 基于空调面积表计算部门分配比例
- 计算各部门提成金额
- 验证分配比例总和

**接口：**
```typescript
interface DepartmentAllocator {
  // 计算部门分配比例
  calculateDepartmentRatios(
    airConditioningTable: AirConditioningTable,
    allocationRules: AllocationRules
  ): Promise<DepartmentRatio[]>
  
  // 计算部门提成金额
  calculateDepartmentCommissions(
    totalCommission: number,
    departmentRatios: DepartmentRatio[]
  ): Promise<DepartmentCommission[]>
  
  // 验证分配比例
  validateRatios(ratios: DepartmentRatio[]): boolean
}
```

#### 6. 部门内分配模块 (InternalAllocationModule)

**职责：**
- 管理部门内部的提成分配
- 验证分配金额不超过部门总额
- 记录分配历史

**接口：**
```typescript
interface InternalAllocationModule {
  // 创建部门内分配方案
  createAllocationPlan(
    departmentId: string,
    projectId: string,
    allocations: MemberAllocation[]
  ): Promise<AllocationPlan>
  
  // 更新分配方案
  updateAllocationPlan(
    planId: string,
    updates: Partial<AllocationPlan>
  ): Promise<AllocationPlan>
  
  // 获取分配方案
  getAllocationPlan(planId: string): Promise<AllocationPlan>
  
  // 验证分配方案
  validateAllocationPlan(
    plan: AllocationPlan,
    departmentTotal: number
  ): ValidationResult
}
```

#### 7. 发放记录模块 (PaymentModule)

**职责：**
- 记录提成发放
- 跟踪发放历史
- 计算剩余未发金额

**接口：**
```typescript
interface PaymentModule {
  // 记录发放
  recordPayment(payment: PaymentRecord): Promise<void>
  
  // 查询发放记录
  getPaymentRecords(filter: PaymentFilter): Promise<PaymentRecord[]>
  
  // 获取项目已发金额
  getProjectPaidAmount(projectId: string): Promise<number>
  
  // 获取人员已发金额
  getPersonPaidAmount(personId: string, period: Period): Promise<number>
}
```

#### 8. 报表生成器 (ReportGenerator)

**职责：**
- 生成半年度汇总报表
- 生成各类查询报表
- 导出Excel和PDF

**接口：**
```typescript
interface ReportGenerator {
  // 生成半年度汇总
  generateSemiAnnualReport(period: Period): Promise<SemiAnnualReport>
  
  // 生成部门报表
  generateDepartmentReport(departmentId: string, period: Period): Promise<DepartmentReport>
  
  // 生成个人报表
  generatePersonReport(personId: string, period: Period): Promise<PersonReport>
  
  // 导出为Excel
  exportToExcel(report: Report): Promise<Buffer>
  
  // 导出为PDF
  exportToPDF(report: Report): Promise<Buffer>
}
```

#### 9. Excel导入导出模块 (ExcelModule)

**职责：**
- 解析Excel项目清单
- 解析Excel空调面积表
- 生成Excel提成报表

**接口：**
```typescript
interface ExcelModule {
  // 导入项目清单
  importProjectList(file: Buffer): Promise<Project[]>
  
  // 导入空调面积表
  importAirConditioningTable(file: Buffer, projectId: string): Promise<AirConditioningTable>
  
  // 导出提成数据
  exportCommissionData(data: CommissionData): Promise<Buffer>
  
  // 验证Excel格式
  validateExcelFormat(file: Buffer, templateType: string): ValidationResult
}
```

#### 10. 公式配置模块 (FormulaConfigModule)

**职责：**
- 管理计算公式配置
- 管理部门分配规则
- 记录配置变更历史

**接口：**
```typescript
interface FormulaConfigModule {
  // 保存计算公式
  saveCalculationFormula(formula: CalculationFormula): Promise<void>
  
  // 获取当前公式
  getCurrentFormula(): Promise<CalculationFormula>
  
  // 保存分配规则
  saveAllocationRules(rules: AllocationRules): Promise<void>
  
  // 获取当前规则
  getCurrentRules(): Promise<AllocationRules>
  
  // 获取配置历史
  getConfigHistory(): Promise<ConfigHistory[]>
}
```

## 数据模型

### 核心实体

#### User (用户)
```typescript
interface User {
  id: string
  username: string
  passwordHash: string
  name: string
  role: 'admin' | 'finance' | 'manager' | 'employee'
  departmentId?: string
  email?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}
```

#### Department (部门)
```typescript
interface Department {
  id: string
  name: string
  code: string
  managerId: string
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

#### Project (项目)
```typescript
interface Project {
  id: string
  code: string
  name: string
  stage: 'scheme' | 'construction' | 'cooperation'
  buildingAttributes: BuildingAttributes
  calculatedCommission: number
  status: 'active' | 'completed' | 'archived'
  period: string  // 例如 "2025上半年"
  hasAddition: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### BuildingAttributes (建筑属性)
```typescript
interface BuildingAttributes {
  area?: number  // 面积
  buildingType?: string  // 建筑类型
  floors?: number  // 层数
  [key: string]: any  // 其他可配置属性
}
```

#### AirConditioningTable (空调面积表)
```typescript
interface AirConditioningTable {
  id: string
  projectId: string
  entries: AirConditioningEntry[]
  totalArea: number
  createdAt: Date
  updatedAt: Date
}

interface AirConditioningEntry {
  type: string  // 空调形式：全中央空调、VRV空调(布管)、VRV空调(不布管)、分体空调及消防排烟等
  location?: string  // 采用空调部位
  area: number  // 空调面积
  notes?: string  // 备注
}
```

#### DepartmentCommission (部门提成)
```typescript
interface DepartmentCommission {
  id: string
  projectId: string
  departmentId: string
  ratio: number  // 分配比例 (0-1)
  amount: number  // 提成金额
  calculationBasis: string  // 计算依据
  createdAt: Date
  updatedAt: Date
}
```

#### AllocationPlan (部门内分配方案)
```typescript
interface AllocationPlan {
  id: string
  projectId: string
  departmentId: string
  departmentTotal: number
  allocations: MemberAllocation[]
  status: 'draft' | 'approved' | 'paid'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface MemberAllocation {
  userId: string
  userName: string
  amount: number
  ratio: number
  notes?: string
}
```

#### ProjectAddition (项目追加)
```typescript
interface ProjectAddition {
  id: string
  projectId: string
  additionNumber: number  // 第几次追加
  buildingAttributesChange: Partial<BuildingAttributes>
  airConditioningTableChange?: Partial<AirConditioningTable>
  newTotalCommission: number
  incrementalCommission: number
  createdAt: Date
}
```

#### PaymentRecord (发放记录)
```typescript
interface PaymentRecord {
  id: string
  projectId: string
  userId: string
  amount: number
  paymentDate: Date
  paymentBatch: string  // 发放批次，如 "2025年8月第1次"
  notes?: string
  createdBy: string
  createdAt: Date
}
```

#### CalculationFormula (计算公式)
```typescript
interface CalculationFormula {
  id: string
  name: string
  description: string
  formulaType: 'building_commission'  // 建筑属性提成计算
  formula: string  // 公式表达式或规则
  parameters: FormulaParameter[]
  effectiveFrom: Date
  effectiveTo?: Date
  createdAt: Date
  updatedAt: Date
}

interface FormulaParameter {
  name: string
  type: 'number' | 'string' | 'boolean'
  description: string
  defaultValue?: any
}
```

#### AllocationRules (分配规则)
```typescript
interface AllocationRules {
  id: string
  name: string
  description: string
  ruleType: 'department_allocation'  // 部门分配规则
  rules: DepartmentRule[]
  effectiveFrom: Date
  effectiveTo?: Date
  createdAt: Date
  updatedAt: Date
}

interface DepartmentRule {
  departmentId: string
  departmentName: string
  airConditioningTypes: string[]  // 该部门负责的空调类型
  baseRatio?: number  // 基础比例
  calculationMethod: string  // 计算方法描述
}
```

### 数据库关系

```
User ──┬─── manages ───> Department
       └─── belongs to ─> Department

Project ──┬─── has ───> AirConditioningTable
          ├─── has ───> DepartmentCommission (多个)
          ├─── has ───> ProjectAddition (多个)
          └─── has ───> PaymentRecord (多个)

Department ──┬─── has ───> DepartmentCommission (多个)
             └─── has ───> AllocationPlan (多个)

AllocationPlan ──> contains ──> MemberAllocation (多个)

PaymentRecord ──> references ──> User
                └──> references ──> Project
```


## 正确性属性

*属性是系统在所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：用户角色权限隔离

*对于任何*部门经理用户，当该用户查询数据时，返回的数据应该仅包含该用户所属部门的数据，不包含其他部门的数据

**验证需求：需求 1.3**

### 属性 2：未授权访问拒绝

*对于任何*用户和资源，当用户尝试访问其无权限的资源时，系统应该拒绝访问并返回权限不足的错误

**验证需求：需求 1.4**

### 属性 3：项目数据完整性

*对于任何*项目数据，当项目被创建或修改后，查询该项目应该返回完整的项目信息，包括名称、编号、设计阶段、建筑属性等所有字段

**验证需求：需求 2.1, 2.3**

### 属性 4：修改历史记录

*对于任何*项目或空调面积表，当数据被修改时，系统应该保留修改历史记录，且历史记录应该包含修改前后的值和修改时间

**验证需求：需求 2.2, 4.2**

### 属性 5：提成计算一致性

*对于任何*项目和计算公式，当使用相同的建筑属性和公式计算提成时，应该得到相同的结果

**验证需求：需求 3.2**

### 属性 6：属性变化触发重算

*对于任何*项目，当其建筑属性发生变化时，系统应该重新计算提成总额，且新的提成总额应该反映变化后的属性

**验证需求：需求 3.3**

### 属性 7：空调面积表数据完整性

*对于任何*空调面积表，当表被保存后，查询该表应该返回所有空调形式条目及其对应的面积数据

**验证需求：需求 4.1, 4.3**

### 属性 8：部门分配比例总和不变量

*对于任何*项目的部门分配计算，所有部门的分配比例之和应该等于100%（误差在0.01%以内）

**验证需求：需求 5.5**

### 属性 9：空调面积变化触发重算

*对于任何*项目，当其空调面积表发生变化时，系统应该重新计算各部门的分配比例

**验证需求：需求 5.3**

### 属性 10：部门内分配总额约束

*对于任何*部门内分配方案，所有成员的分配金额之和应该小于或等于该部门的可分配提成总额

**验证需求：需求 6.4**

### 属性 11：分配方案数据完整性

*对于任何*部门内分配方案，当方案被保存后，查询该方案应该返回所有成员的分配金额和分配比例

**验证需求：需求 6.2**

### 属性 12：项目追加增量计算

*对于任何*有追加的项目，追加部分的应发提成应该等于（追加后的新总额 - 追加前的原总额 - 已发放金额）

**验证需求：需求 7.3**

### 属性 13：追加历史累计记录

*对于任何*项目，当项目有多次追加时，查询项目应该返回所有追加记录，且追加记录应该按时间顺序排列

**验证需求：需求 7.5**

### 属性 14：发放记录完整性

*对于任何*提成发放记录，当记录被保存后，查询该记录应该包含发放日期、发放金额、发放对象等所有必要信息

**验证需求：需求 8.1**

### 属性 15：项目累计发放金额

*对于任何*项目，该项目的累计发放金额应该等于所有针对该项目的发放记录金额之和

**验证需求：需求 8.3**

### 属性 16：周期项目筛选

*对于任何*计算周期，筛选该周期的项目应该仅返回创建时间或更新时间在该周期内的项目

**验证需求：需求 9.1**

### 属性 17：半年度汇总总额

*对于任何*半年度汇总，每个部门的汇总提成应该等于该部门在该周期内所有项目的部门提成之和

**验证需求：需求 9.2**

### 属性 18：Excel导入导出往返一致性

*对于任何*提成数据，导出为Excel后再导入，应该得到与原始数据等价的数据（关键字段值相同）

**验证需求：需求 10.3**

### 属性 19：公式配置应用一致性

*对于任何*新配置的计算公式，该公式应该被应用于配置后创建的所有新项目的提成计算

**验证需求：需求 11.1**

### 属性 20：公式修改历史记录

*对于任何*计算公式的修改，系统应该记录修改历史，且历史记录应该包含修改前后的公式内容和修改时间

**验证需求：需求 11.3**

### 属性 21：个人提成查询准确性

*对于任何*人员，查询该人员的提成明细，返回的提成总额应该等于该人员在所有项目中的分配金额之和

**验证需求：需求 12.1**

### 属性 22：时间范围筛选准确性

*对于任何*时间范围查询，返回的数据应该仅包含时间戳在指定范围内的记录，不包含范围外的记录

**验证需求：需求 12.4**

## 错误处理

### 错误类型

系统应该处理以下类型的错误：

#### 1. 认证和授权错误
- **InvalidCredentialsError**: 用户名或密码错误
- **TokenExpiredError**: 认证令牌已过期
- **PermissionDeniedError**: 用户无权限访问资源

#### 2. 数据验证错误
- **ValidationError**: 数据验证失败（如必填字段缺失、格式错误）
- **ConstraintViolationError**: 违反数据约束（如分配总额超过部门总额）
- **DuplicateError**: 数据重复（如项目编号重复）

#### 3. 业务逻辑错误
- **CalculationError**: 计算过程出错
- **FormulaNotFoundError**: 找不到适用的计算公式
- **InsufficientDataError**: 数据不足以进行计算（如空调面积表缺失）

#### 4. 数据访问错误
- **NotFoundError**: 请求的资源不存在
- **DatabaseError**: 数据库操作失败
- **ConcurrencyError**: 并发修改冲突

#### 5. 文件处理错误
- **FileFormatError**: Excel文件格式错误
- **ParseError**: 文件解析失败
- **ExportError**: 数据导出失败

### 错误处理策略

#### 前端错误处理
```typescript
// 统一错误处理
try {
  const result = await api.calculateCommission(projectId)
  // 处理成功结果
} catch (error) {
  if (error instanceof ValidationError) {
    // 显示验证错误提示
    showValidationErrors(error.details)
  } else if (error instanceof PermissionDeniedError) {
    // 显示权限错误
    showPermissionError()
  } else {
    // 显示通用错误
    showGenericError(error.message)
  }
}
```

#### 后端错误处理
```typescript
// API层错误处理
app.use((err, req, res, next) => {
  // 记录错误日志
  logger.error(err)
  
  // 根据错误类型返回适当的HTTP状态码
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.details
    })
  } else if (err instanceof PermissionDeniedError) {
    return res.status(403).json({
      error: 'PermissionDenied',
      message: '您没有权限执行此操作'
    })
  } else if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: 'NotFound',
      message: err.message
    })
  } else {
    return res.status(500).json({
      error: 'InternalServerError',
      message: '服务器内部错误'
    })
  }
})
```

#### 数据库事务处理
```typescript
// 使用事务确保数据一致性
async function createProjectWithCommission(projectData, commissionData) {
  const transaction = await db.transaction()
  
  try {
    // 创建项目
    const project = await Project.create(projectData, { transaction })
    
    // 计算提成
    const commission = await calculateCommission(project, { transaction })
    
    // 保存提成数据
    await DepartmentCommission.bulkCreate(commission, { transaction })
    
    // 提交事务
    await transaction.commit()
    
    return project
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}
```

### 错误恢复机制

1. **自动重试**: 对于临时性错误（如网络超时），系统应该自动重试
2. **数据回滚**: 对于事务性操作，失败时应该回滚到一致状态
3. **错误日志**: 所有错误应该被记录，便于排查问题
4. **用户友好提示**: 错误信息应该清晰易懂，指导用户如何解决

## 测试策略

### 单元测试

单元测试用于验证各个模块和函数的正确性。

**测试范围：**
- 提成计算引擎的计算逻辑
- 部门分配计算器的分配算法
- 数据验证函数
- Excel解析和生成函数
- 权限检查函数

**测试工具：**
- Jest (JavaScript/TypeScript)
- Mocha + Chai (备选)

**示例：**
```typescript
describe('CommissionCalculator', () => {
  it('应该根据建筑面积正确计算提成', () => {
    const project = {
      buildingAttributes: { area: 10000 }
    }
    const formula = {
      formula: 'area * 0.05'
    }
    const result = calculateTotalCommission(project, formula)
    expect(result).toBe(500)
  })
  
  it('应该处理缺失建筑属性的情况', () => {
    const project = {
      buildingAttributes: {}
    }
    const formula = {
      formula: 'area * 0.05'
    }
    expect(() => calculateTotalCommission(project, formula))
      .toThrow(InsufficientDataError)
  })
})
```

### 属性基于测试 (Property-Based Testing)

属性基于测试用于验证系统在各种输入下都满足正确性属性。

**测试框架：** fast-check (JavaScript/TypeScript)

**测试配置：** 每个属性测试至少运行100次迭代

**测试标注：** 每个属性测试必须使用注释明确标注对应的设计文档属性
- 格式：`// **Feature: performance-commission-system, Property {number}: {property_text}**`

**测试范围：**
- 所有在"正确性属性"部分定义的属性
- 数据不变量（如分配比例总和、分配金额约束）
- 往返属性（如Excel导入导出）
- 计算一致性

**示例：**
```typescript
import fc from 'fast-check'

describe('正确性属性测试', () => {
  // **Feature: performance-commission-system, Property 8: 部门分配比例总和不变量**
  it('属性8：所有部门分配比例之和应该等于100%', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          departmentId: fc.string(),
          ratio: fc.float({ min: 0, max: 1 })
        })),
        (ratios) => {
          // 归一化比例
          const normalized = normalizeDepartmentRatios(ratios)
          
          // 计算总和
          const sum = normalized.reduce((acc, r) => acc + r.ratio, 0)
          
          // 验证总和等于1（100%），允许0.0001的误差
          expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  // **Feature: performance-commission-system, Property 10: 部门内分配总额约束**
  it('属性10：部门内分配总额不应超过部门可分配总额', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 100000 }), // 部门总额
        fc.array(fc.float({ min: 0, max: 10000 })), // 成员分配
        (departmentTotal, memberAllocations) => {
          const plan = {
            departmentTotal,
            allocations: memberAllocations.map((amount, i) => ({
              userId: `user${i}`,
              amount
            }))
          }
          
          const validation = validateAllocationPlan(plan, departmentTotal)
          
          const sum = memberAllocations.reduce((a, b) => a + b, 0)
          
          if (sum > departmentTotal) {
            expect(validation.isValid).toBe(false)
          } else {
            expect(validation.isValid).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  // **Feature: performance-commission-system, Property 18: Excel导入导出往返一致性**
  it('属性18：Excel导出后再导入应该得到等价数据', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          projectName: fc.string(),
          commission: fc.float({ min: 0, max: 100000 }),
          department: fc.string()
        })),
        async (originalData) => {
          // 导出为Excel
          const excelBuffer = await exportToExcel(originalData)
          
          // 从Excel导入
          const importedData = await importFromExcel(excelBuffer)
          
          // 验证关键字段相同
          expect(importedData.length).toBe(originalData.length)
          
          for (let i = 0; i < originalData.length; i++) {
            expect(importedData[i].projectName).toBe(originalData[i].projectName)
            expect(Math.abs(importedData[i].commission - originalData[i].commission))
              .toBeLessThan(0.01)
            expect(importedData[i].department).toBe(originalData[i].department)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 集成测试

集成测试用于验证各个模块协同工作的正确性。

**测试范围：**
- API端点的完整流程
- 数据库操作的事务性
- 认证和授权流程
- 文件上传和下载流程

**测试工具：**
- Supertest (API测试)
- 测试数据库 (独立的测试环境)

**示例：**
```typescript
describe('项目提成计算完整流程', () => {
  it('应该完成从创建项目到生成报表的完整流程', async () => {
    // 1. 创建项目
    const project = await request(app)
      .post('/api/projects')
      .send({
        name: '测试项目',
        buildingAttributes: { area: 10000 }
      })
      .expect(201)
    
    // 2. 添加空调面积表
    await request(app)
      .post(`/api/projects/${project.body.id}/air-conditioning`)
      .send({
        entries: [
          { type: 'VRV空调', area: 5000 },
          { type: '分体空调', area: 5000 }
        ]
      })
      .expect(200)
    
    // 3. 计算提成
    const commission = await request(app)
      .post(`/api/projects/${project.body.id}/calculate`)
      .expect(200)
    
    expect(commission.body.totalCommission).toBeGreaterThan(0)
    expect(commission.body.departmentCommissions).toHaveLength(4)
    
    // 4. 生成报表
    const report = await request(app)
      .get(`/api/reports/project/${project.body.id}`)
      .expect(200)
    
    expect(report.body.projectName).toBe('测试项目')
  })
})
```

### 端到端测试 (E2E)

端到端测试用于验证用户完整的使用场景。

**测试工具：**
- Playwright 或 Cypress

**测试范围：**
- 用户登录流程
- 项目创建和管理流程
- 提成计算和分配流程
- 报表查看和导出流程

**示例：**
```typescript
test('财务人员完整工作流程', async ({ page }) => {
  // 登录
  await page.goto('/login')
  await page.fill('[name="username"]', 'finance')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  
  // 创建项目
  await page.click('text=新建项目')
  await page.fill('[name="projectName"]', '测试项目')
  await page.fill('[name="area"]', '10000')
  await page.click('text=保存')
  
  // 上传空调面积表
  await page.click('text=上传空调面积表')
  await page.setInputFiles('input[type="file"]', 'test-data/air-conditioning.xlsx')
  await page.click('text=确认上传')
  
  // 计算提成
  await page.click('text=计算提成')
  await page.waitForSelector('text=计算完成')
  
  // 验证结果
  const totalCommission = await page.textContent('.total-commission')
  expect(parseFloat(totalCommission)).toBeGreaterThan(0)
})
```

### 测试数据生成

为了支持属性基于测试，需要实现智能的测试数据生成器：

```typescript
// 项目数据生成器
const projectArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  code: fc.string({ minLength: 1, maxLength: 20 }),
  stage: fc.constantFrom('scheme', 'construction', 'cooperation'),
  buildingAttributes: fc.record({
    area: fc.float({ min: 100, max: 100000 }),
    floors: fc.integer({ min: 1, max: 50 }),
    buildingType: fc.constantFrom('住宅', '办公', '商业', '工业')
  })
})

// 空调面积表生成器
const airConditioningTableArbitrary = fc.record({
  entries: fc.array(
    fc.record({
      type: fc.constantFrom(
        '全中央空调',
        'VRV空调（布管）',
        'VRV空调（不布管）',
        '分体空调及消防排烟',
        '仅有分体空调'
      ),
      area: fc.float({ min: 0, max: 50000 }),
      location: fc.option(fc.string())
    }),
    { minLength: 1, maxLength: 10 }
  )
})

// 部门分配生成器
const departmentAllocationArbitrary = (totalAmount: number) =>
  fc.array(
    fc.record({
      departmentId: fc.string(),
      ratio: fc.float({ min: 0, max: 1 })
    }),
    { minLength: 1, maxLength: 10 }
  ).map(allocations => {
    // 归一化比例使总和为1
    const sum = allocations.reduce((acc, a) => acc + a.ratio, 0)
    return allocations.map(a => ({
      ...a,
      ratio: a.ratio / sum,
      amount: (a.ratio / sum) * totalAmount
    }))
  })
```

### 测试覆盖率目标

- **代码覆盖率**: 至少80%
- **分支覆盖率**: 至少75%
- **属性测试覆盖**: 所有定义的正确性属性都必须有对应的属性测试

### 持续集成

测试应该集成到CI/CD流程中：

1. **提交前检查**: 运行单元测试和快速集成测试
2. **Pull Request检查**: 运行完整的测试套件
3. **部署前检查**: 运行所有测试包括E2E测试
4. **定期测试**: 每天运行一次完整的属性测试（更多迭代次数）

## 安全考虑

### 认证和授权

1. **密码安全**:
   - 使用bcrypt或argon2进行密码哈希
   - 强制密码复杂度要求
   - 实施密码过期策略

2. **会话管理**:
   - 使用JWT进行无状态认证
   - 设置合理的令牌过期时间
   - 实施令牌刷新机制

3. **权限控制**:
   - 基于角色的访问控制(RBAC)
   - 最小权限原则
   - 所有API端点都需要权限检查

### 数据安全

1. **敏感数据保护**:
   - 工资卡号等敏感信息加密存储
   - 传输过程使用HTTPS
   - 日志中不记录敏感信息

2. **SQL注入防护**:
   - 使用ORM参数化查询
   - 输入验证和清理

3. **XSS防护**:
   - 前端输出转义
   - Content Security Policy

4. **CSRF防护**:
   - 使用CSRF令牌
   - SameSite Cookie属性

### 审计日志

记录关键操作的审计日志：
- 用户登录/登出
- 数据修改操作
- 权限变更
- 提成计算和发放
- 配置变更

## 性能考虑

### 数据库优化

1. **索引策略**:
   - 在常用查询字段上建立索引
   - 复合索引用于多字段查询
   - 定期分析和优化索引

2. **查询优化**:
   - 避免N+1查询问题
   - 使用连接查询代替多次查询
   - 分页查询大数据集

3. **缓存策略**:
   - 缓存计算公式和分配规则
   - 缓存用户权限信息
   - 使用Redis进行会话缓存

### 前端性能

1. **代码分割**: 按路由分割代码，减少初始加载时间
2. **懒加载**: 图片和组件按需加载
3. **虚拟滚动**: 大列表使用虚拟滚动
4. **防抖和节流**: 搜索和输入操作使用防抖

### 计算性能

1. **异步处理**: 复杂计算使用后台任务
2. **批量操作**: 批量计算和保存数据
3. **增量计算**: 项目追加时只计算增量部分

## 部署架构

### 字节扣子平台部署

系统将部署在字节扣子平台上，利用平台提供的以下能力：

1. **应用托管**: 
   - 前端静态资源托管
   - 后端API服务部署
   - 自动扩缩容

2. **数据库服务**:
   - 托管数据库服务
   - 自动备份
   - 高可用配置

3. **文件存储**:
   - 对象存储服务
   - Excel文件和附件存储

4. **监控和日志**:
   - 应用性能监控
   - 错误日志收集
   - 访问日志分析

### 环境配置

1. **开发环境**: 本地开发和测试
2. **测试环境**: 集成测试和用户验收测试
3. **生产环境**: 正式运行环境

### 备份和恢复

1. **数据库备份**:
   - 每日全量备份
   - 每小时增量备份
   - 保留30天备份

2. **文件备份**:
   - 定期备份上传的Excel文件
   - 版本控制

3. **灾难恢复**:
   - 恢复时间目标(RTO): 4小时
   - 恢复点目标(RPO): 1小时

## 可维护性

### 代码组织

1. **模块化设计**: 按功能模块组织代码
2. **清晰的目录结构**: 统一的项目结构
3. **命名规范**: 遵循一致的命名约定
4. **代码注释**: 关键逻辑添加注释

### 文档

1. **API文档**: 使用Swagger/OpenAPI
2. **代码文档**: JSDoc注释
3. **部署文档**: 部署步骤和配置说明
4. **用户手册**: 面向最终用户的使用指南

### 版本控制

1. **Git工作流**: 使用Git Flow或GitHub Flow
2. **语义化版本**: 遵循SemVer规范
3. **变更日志**: 记录每个版本的变更

### 监控和告警

1. **应用监控**: 监控API响应时间和错误率
2. **数据库监控**: 监控查询性能和连接数
3. **业务监控**: 监控关键业务指标
4. **告警机制**: 异常情况及时通知

## 扩展性考虑

### 功能扩展

系统设计应该支持未来可能的功能扩展：

1. **新的计算公式**: 通过配置添加新的计算规则
2. **新的部门类型**: 灵活的部门管理
3. **新的报表类型**: 可扩展的报表生成器
4. **移动端支持**: 响应式设计或独立移动应用

### 数据扩展

1. **分表分库**: 支持大数据量的分表策略
2. **归档策略**: 历史数据归档
3. **数据导出**: 支持多种格式的数据导出

### 集成扩展

1. **第三方集成**: 预留集成接口
2. **Webhook**: 支持事件通知
3. **API开放**: 提供标准化的API接口
