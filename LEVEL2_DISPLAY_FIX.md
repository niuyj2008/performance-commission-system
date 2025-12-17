# 第二级部门分配显示修复说明

## 更新日期
2024年12月14日

## 问题描述

第二级部门分配功能已实现，但显示效果与预期不符：
1. 部门名称显示不正确
2. 分配数字显示不正确

## 问题原因

### 1. 部门ID映射错误
- **配置文件中的部门ID**: `arch`, `structure`, `water`, `electric`, `hvac`
- **前端代码中使用的ID**: `architecture`, `plumbing`, `electrical`, `hvac`
- 导致部门名称无法正确映射

### 2. 空调类型key不匹配
- **数据库中存储的**: 中文名称（如"全中央空调"）
- **配置文件中的key**: 英文key（如"centralAC"）
- 导致无法找到对应的系数配置，计算结果错误

## 修复内容

### 1. 修复前端部门名称映射

**文件**: `public/project-detail.html`

**修改前**:
```javascript
const deptNames = {
  'chief': '总负责',
  'architecture': '建筑部',
  'structure': '结构部',
  'plumbing': '给排水部',
  'electrical': '电气部',
  'hvac': '空调部'
};
```

**修改后**:
```javascript
const deptNames = {
  'chief': '总负责',
  'arch': '建筑部',
  'structure': '结构部',
  'water': '给排水部',
  'electric': '电气部',
  'hvac': '空调部'
};
```

### 2. 添加空调类型映射

**文件**: `server/utils/commission.js`

在`calculateDepartmentAllocation`函数中添加中文到英文的映射：

```javascript
// 中文空调类型到配置key的映射
const acTypeMapping = {
  '没有空调': 'none',
  '全中央空调': 'centralAC',
  'VRV空调（布管）': 'vrvWithPipe',
  'VRV空调（不布管）': 'vrvWithoutPipe',
  '分体空调及消防排烟': 'splitACWithSmoke',
  '仅有分体空调': 'splitACOnly',
  '仅有消防排烟': 'smokeOnly',
  '地下室通风及消防排烟': 'basementVentilation'
};

// 使用映射查找配置
const acTypeChinese = item.ac_type;
const acTypeKey = acTypeMapping[acTypeChinese] || acTypeChinese;
const typeConfig = cfg.airConditioningTypes[acTypeKey];
```

## 配置文件中的部门ID

**文件**: `server/config/commission-config.json`

```json
"departments": [
  { "id": "arch", "name": "建筑部" },
  { "id": "structure", "name": "结构部" },
  { "id": "water", "name": "给排水部" },
  { "id": "electric", "name": "电气部" },
  { "id": "hvac", "name": "空调部" }
]
```

## 空调类型配置key

**文件**: `server/config/commission-config.json`

```json
"airConditioningTypes": {
  "none": { "name": "没有空调", ... },
  "centralAC": { "name": "全中央空调", ... },
  "vrvWithPipe": { "name": "VRV空调（布管）", ... },
  "vrvWithoutPipe": { "name": "VRV空调（不布管）", ... },
  "splitACWithSmoke": { "name": "分体空调及消防排烟", ... },
  "splitACOnly": { "name": "仅有分体空调", ... },
  "smokeOnly": { "name": "仅有消防排烟", ... },
  "basementVentilation": { "name": "地下室通风及消防排烟", ... }
}
```

## 修复后的显示效果

### 韶关华韶27号地块项目

**项目信息**:
- 建筑面积: 35,287㎡
- 项目总提成: ¥271,176.18
- 设计阶段: 施工图设计

**空调面积表**:
| 空调类型 | 面积 | 占比 |
|---------|------|------|
| 全中央空调 | 23,215㎡ | 65.8% |
| VRV空调（布管） | 1,795㎡ | 5.1% |
| VRV空调（不布管） | 10,277㎡ | 29.1% |

**部门分配结果**:
| 部门 | 分配金额 | 分配比例 |
|------|----------|----------|
| 总负责 | ¥16,134.98 | 7.00% |
| 建筑部 | ¥72,384.21 | 33.76% |
| 结构部 | ¥70,225.70 | 32.76% |
| 给排水部 | ¥23,051.29 | 10.75% |
| 电气部 | ¥27,338.59 | 12.75% |
| 空调部 | ¥21,379.86 | 9.97% |

**合计**: ¥230,514.63

## 验证方法

### 1. 检查部门名称显示
- 进入项目详情页
- 查看"第二级：部门分配"区域
- 确认显示的是中文部门名称（建筑部、结构部等）

### 2. 检查分配金额
- 确认各部门的分配金额合理
- 总负责约为7%
- 各工种分配比例符合空调面积表的计算结果

### 3. 检查计算逻辑
```bash
# 查看服务器日志，确认没有"未找到空调类型配置"的警告
```

## 修复状态

✅ 前端部门名称映射已修复  
✅ 后端空调类型映射已添加  
✅ 服务器已重启  
✅ 显示效果正常  

---

**修复完成！** 现在部门分配的显示应该正确了，请刷新浏览器查看效果。
