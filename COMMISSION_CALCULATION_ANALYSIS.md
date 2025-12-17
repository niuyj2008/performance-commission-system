# 提成计算分析报告

## 三级分配体系

### 第一级：项目提成总额计算
**基于建筑属性计算项目的总提成金额**

#### 提取的计算因子：

1. **建筑类型**
   - 办公楼/大厦
   - 住宅/宿舍
   - 学校（学院、图书馆、教学楼、实训楼）
   - 商业（酒店、宾馆、商业街）
   - 工业（数据中心、厂房、IDC）
   - 其他（规划、总图等）

2. **设计阶段**
   - 方案设计
   - 施工图设计
   - 施工配合（含修改、变更）

3. **建筑面积**
   - 数值（平方米）

4. **特殊属性**
   - 是否有地下室
   - 是否有人防设计
   - 是否为绿建设计
   - 是否为装配式建筑
   - 是否为报建项目
   - 是否为审图项目

5. **项目规模系数**
   - 小型项目（< 5000㎡）
   - 中型项目（5000-20000㎡）
   - 大型项目（> 20000㎡）

#### 计算公式建议：
```
项目提成总额 = 基础提成 × 建筑类型系数 × 设计阶段系数 × 特殊属性加成

其中：
- 基础提成 = 建筑面积 × 单价
- 单价根据建筑类型和规模确定
- 特殊属性加成 = (1 + 地下室系数 + 人防系数 + 绿建系数 + ...)
```

#### 配置示例：
```javascript
{
  "buildingTypes": {
    "office": { "name": "办公楼", "baseRate": 5.0 },
    "residential": { "name": "住宅", "baseRate": 4.0 },
    "school": { "name": "学校", "baseRate": 4.5 },
    "commercial": { "name": "商业", "baseRate": 5.5 },
    "industrial": { "name": "工业", "baseRate": 4.0 }
  },
  "designStages": {
    "scheme": { "name": "方案", "coefficient": 0.6 },
    "construction": { "name": "施工图", "coefficient": 1.0 },
    "cooperation": { "name": "施工配合", "coefficient": 0.4 }
  },
  "specialAttributes": {
    "hasBasement": { "name": "有地下室", "bonus": 0.15 },
    "hasCivilDefense": { "name": "有人防", "bonus": 0.10 },
    "isGreenBuilding": { "name": "绿建设计", "bonus": 0.05 },
    "isPrefabricated": { "name": "装配式", "bonus": 0.08 }
  }
}
```

---

### 第二级：部门分配计算
**基于空调面积表将项目提成分配给各参与部门**

#### 提取的计算因子：

1. **空调类型及面积**
   - 没有空调
   - 全中央空调
   - VRV空调（布管）
   - VRV空调（不布管）
   - 分体空调及消防排烟
   - 仅有分体空调
   - 仅有消防排烟
   - 地下室通风及消防排烟

2. **参与部门列表**
   - 总负责
   - 创作部
   - 建筑一部
   - 建筑二部
   - 建筑三部
   - 结构部
   - 给排水部
   - 电气部
   - 空调部

#### 计算逻辑：
```
1. 根据空调面积表，计算每种空调类型的面积占比
2. 每种空调类型对应不同的部门参与系数
3. 部门分配金额 = Σ(空调类型面积 × 该类型下的部门系数) / 总系数 × 项目提成总额
```

#### 配置示例：
```javascript
{
  "airConditioningTypes": {
    "none": {
      "name": "没有空调",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.40,
        "architecture2": 0.40,
        "structure": 0.40,
        "water": 0.10,
        "electric": 0.10,
        "hvac": 0.0
      }
    },
    "centralAC": {
      "name": "全中央空调",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.30,
        "architecture2": 0.30,
        "structure": 0.35,
        "water": 0.15,
        "electric": 0.15,
        "hvac": 0.50
      }
    },
    "vrvWithPipe": {
      "name": "VRV空调（布管）",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.35,
        "architecture2": 0.35,
        "structure": 0.35,
        "water": 0.12,
        "electric": 0.15,
        "hvac": 0.40
      }
    },
    "vrvWithoutPipe": {
      "name": "VRV空调（不布管）",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.35,
        "architecture2": 0.35,
        "structure": 0.35,
        "water": 0.10,
        "electric": 0.12,
        "hvac": 0.35
      }
    },
    "splitACWithSmoke": {
      "name": "分体空调及消防排烟",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.38,
        "architecture2": 0.38,
        "structure": 0.38,
        "water": 0.12,
        "electric": 0.15,
        "hvac": 0.30
      }
    },
    "splitACOnly": {
      "name": "仅有分体空调",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.40,
        "architecture2": 0.40,
        "structure": 0.38,
        "water": 0.10,
        "electric": 0.15,
        "hvac": 0.25
      }
    },
    "smokeOnly": {
      "name": "仅有消防排烟",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.35,
        "architecture2": 0.35,
        "structure": 0.35,
        "water": 0.15,
        "electric": 0.20,
        "hvac": 0.20
      }
    },
    "basementVentilation": {
      "name": "地下室通风及消防排烟",
      "departments": {
        "chief": 0.05,
        "architecture1": 0.30,
        "architecture2": 0.30,
        "structure": 0.40,
        "water": 0.15,
        "electric": 0.20,
        "hvac": 0.35
      }
    }
  }
}
```

---

### 第三级：部门内分配
**由部门经理将部门提成分配给部门成员**

#### 特点：
- 无需计算公式
- 由部门经理根据实际工作量灵活分配
- 系统只需验证：部门内分配总额 ≤ 部门可分配总额

---

## 实施建议

1. **配置化管理**
   - 所有系数和权重都应该可配置
   - 提供管理界面让管理员调整参数
   - 保留配置历史，支持版本管理

2. **计算透明化**
   - 每次计算都应该显示详细的计算依据
   - 记录使用的配置版本
   - 支持重新计算

3. **灵活性**
   - 支持手动调整计算结果
   - 支持特殊项目的自定义规则
   - 支持多种计算模式并存

4. **数据完整性**
   - 第一级计算需要：建筑属性数据
   - 第二级计算需要：空调面积表数据
   - 如果数据不完整，应该提示用户补充
