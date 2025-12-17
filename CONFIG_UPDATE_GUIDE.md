# 配置文件更新指南

## 当前问题

权威表格（韶谷数码城项目）使用的计算公式：
```
提成单价 = 计算基价(22) × 提成比例(0.27) × 项目规模系数(1.25) × 工程类别系数(1) × 层高系数(1.15) × 建筑形式系数(1) × 裙楼面积比系数(0.9) × 地下室面积比系数(1)
提成单价 = 7.68元/㎡
总提成 = 7.68 × 35287 = 271,176.18元
```

当前系统的配置文件只有一个简化的`baseRate`，无法反映这些复杂的系数。

## 解决方案

有两种方案：

### 方案1：简化配置（推荐用于小公司）

直接在配置文件中设置最终的提成单价，不暴露中间计算过程：

```json
"buildingTypes": {
  "office": {
    "name": "办公楼",
    "baseRate": 7.68,
    "description": "已包含所有系数的最终单价（元/㎡）"
  }
}
```

**优点**：
- 配置简单，易于理解
- 适合小公司使用
- 可以根据实际项目调整单价

**缺点**：
- 无法看到中间计算过程
- 需要手动计算最终单价

### 方案2：完整系数配置（适合需要灵活调整的场景）

在配置文件中添加所有系数：

```json
"level1": {
  "basePrice": 22,
  "commissionRatio": 0.27,
  
  "buildingTypes": {
    "office": {
      "name": "办公楼",
      "typeCoefficient": 1.0
    }
  },
  
  "scaleCoefficients": {
    "small": { "maxArea": 5000, "coefficient": 1.0 },
    "medium": { "maxArea": 20000, "coefficient": 1.15 },
    "large": { "maxArea": 50000, "coefficient": 1.25 },
    "xlarge": { "maxArea": 999999, "coefficient": 1.35 }
  },
  
  "heightCoefficients": {
    "low": { "maxFloors": 6, "coefficient": 1.0 },
    "medium": { "maxFloors": 12, "coefficient": 1.1 },
    "high": { "maxFloors": 24, "coefficient": 1.15 },
    "superhigh": { "maxFloors": 999, "coefficient": 1.2 }
  },
  
  "formCoefficients": {
    "single": 1.0,
    "complex": 1.1
  },
  
  "podiumRatioCoefficients": {
    "none": { "maxRatio": 0, "coefficient": 1.0 },
    "small": { "maxRatio": 0.1, "coefficient": 0.9 },
    "medium": { "maxRatio": 0.3, "coefficient": 0.85 },
    "large": { "maxRatio": 1.0, "coefficient": 0.8 }
  },
  
  "basementRatioCoefficients": {
    "none": { "maxRatio": 0, "coefficient": 1.0 },
    "small": { "maxRatio": 0.2, "coefficient": 1.0 },
    "medium": { "maxRatio": 0.5, "coefficient": 1.05 },
    "large": { "maxRatio": 1.0, "coefficient": 1.1 }
  }
}
```

**优点**：
- 可以灵活调整各项系数
- 计算过程透明
- 适合需要精细控制的场景

**缺点**：
- 配置复杂
- 需要理解各项系数的含义
- 对小公司来说可能过于复杂

## 建议

根据用户的需求（"这只是一家小公司，系统不要设计的太复杂"），建议采用**方案1**：

1. 保持当前的简化配置结构
2. 根据实际项目调整`baseRate`
3. 对于韶谷数码城这样的项目，设置`baseRate = 7.68`

## 实施步骤

1. 为每种建筑类型设置合理的`baseRate`
2. 如果需要考虑特殊属性（地下室、绿建等），保留当前的`specialAttributes`配置
3. 在项目创建时，可以手动调整提成单价

## 示例配置

```json
"buildingTypes": {
  "office": {
    "name": "办公楼",
    "baseRate": 7.5,
    "description": "标准办公楼提成单价"
  },
  "residential": {
    "name": "住宅",
    "baseRate": 6.0,
    "description": "标准住宅提成单价"
  },
  "school": {
    "name": "学校",
    "baseRate": 6.5,
    "description": "标准学校提成单价"
  }
}
```

这样，用户可以根据实际情况灵活调整每种建筑类型的提成单价，而不需要理解复杂的系数计算。
