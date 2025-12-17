/**
 * 提成计算工具
 * 配置化版本：基于commission-config.json的配置进行计算
 */

const fs = require('fs');
const path = require('path');

// 加载配置
let config = null;
function loadConfig() {
  if (!config) {
    const configPath = path.join(__dirname, '../config/commission-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  }
  return config;
}

/**
 * 第一级：根据建筑属性计算项目提成总额
 * @param {Object} project - 项目对象
 * @param {number} project.building_area - 建筑面积
 * @param {string} project.building_type - 建筑类型
 * @param {string} project.stage - 设计阶段
 * @param {Object} project.attributes - 特殊属性
 * @returns {Object} 包含总额和计算明细
 */
function calculateTotalCommission(project) {
  const { building_area, building_type, stage, attributes = {} } = project;
  
  if (!building_area || building_area <= 0) {
    throw new Error('建筑面积无效');
  }
  
  const cfg = loadConfig().level1;
  
  // 1. 获取建筑类型的基础单价
  const typeConfig = cfg.buildingTypes[building_type] || cfg.buildingTypes.other;
  const baseRate = typeConfig.baseRate;
  
  // 2. 获取设计阶段系数
  const stageConfig = cfg.designStages[stage] || cfg.designStages.construction;
  const stageCoefficient = stageConfig.coefficient;
  
  // 3. 计算特殊属性加成
  let attributeBonus = 0;
  const appliedAttributes = [];
  
  for (const [attrKey, attrValue] of Object.entries(attributes)) {
    if (attrValue && cfg.specialAttributes[attrKey]) {
      attributeBonus += cfg.specialAttributes[attrKey].bonus;
      appliedAttributes.push(cfg.specialAttributes[attrKey].name);
    }
  }
  
  // 4. 计算总提成
  // 公式：面积 × 基础单价 × 阶段系数 × (1 + 特殊属性加成)
  const baseCommission = building_area * baseRate;
  const stageAdjusted = baseCommission * stageCoefficient;
  const totalCommission = stageAdjusted * (1 + attributeBonus);
  
  // 注意：这里简化处理，将总提成作为设计费提成
  // 空调面积提成需要单独配置空调面积表后计算
  const designFeeCommission = totalCommission;
  const airConditioningCommission = 0;
  const airConditioningArea = 0;
  
  return {
    totalCommission: Math.round(totalCommission * 100) / 100,
    breakdown: {
      buildingArea: building_area,
      buildingType: typeConfig.name,
      baseRate,
      baseCommission: Math.round(baseCommission * 100) / 100,
      stage: stageConfig.name,
      stageCoefficient,
      stageAdjusted: Math.round(stageAdjusted * 100) / 100,
      attributeBonus,
      appliedAttributes,
      // 前端期望的字段
      designFeeCommission: Math.round(designFeeCommission * 100) / 100,
      designFeeUnitPrice: baseRate,
      designFeeCommissionRate: stageCoefficient * (1 + attributeBonus),
      airConditioningCommission: airConditioningCommission,
      airConditioningArea: airConditioningArea,
      airConditioningUnitPrice: 0,
      airConditioningCommissionRate: 0
    }
  };
}

/**
 * 第二级：根据空调面积表计算部门分配
 * 注意：这个函数计算的是工种奖金的分配，不包括总负责
 * @param {number} totalCommission - 项目提成总额
 * @param {string} stage - 设计阶段 ('scheme' 或 'construction')
 * @param {Array} airConditioningTable - 空调面积表数据
 * @returns {Object} 各部门分配金额（包括总负责和各工种）
 */
function calculateDepartmentAllocation(totalCommission, stage, airConditioningTable) {
  const config = loadConfig();
  const cfg = config.level2;
  const stageAlloc = config.stageAllocation;
  const chiefAlloc = config.chiefAllocation;
  
  // 第一步：根据阶段分配
  let stageAmount;
  let stageName;
  
  if (stage === 'scheme') {
    stageAmount = totalCommission * stageAlloc.scheme;
    stageName = '方案设计';
  } else {
    // 默认为施工图
    stageAmount = totalCommission * stageAlloc.construction;
    stageName = '施工图设计';
  }
  
  // 第二步：从施工图金额中分出总负责
  const chiefAmount = stageAmount * chiefAlloc.chief;
  const departmentsAmount = stageAmount * chiefAlloc.departments;
  
  // 第三步：根据空调面积表计算各工种分配
  if (!airConditioningTable || airConditioningTable.length === 0) {
    throw new Error('空调面积表数据缺失');
  }
  
  // 计算总面积
  const totalArea = airConditioningTable.reduce((sum, item) => sum + (item.area || 0), 0);
  
  if (totalArea === 0) {
    throw new Error('空调面积总和为零');
  }
  
  // 初始化各部门的加权系数总和
  const departmentWeights = {};
  cfg.departments.forEach(dept => {
    departmentWeights[dept.id] = 0;
  });
  
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
  
  // 根据每种空调类型的面积和系数，累加各部门的权重
  airConditioningTable.forEach(item => {
    const acTypeChinese = item.ac_type;
    const acTypeKey = acTypeMapping[acTypeChinese] || acTypeChinese;
    const area = item.area || 0;
    const areaRatio = area / totalArea;
    
    const typeConfig = cfg.airConditioningTypes[acTypeKey];
    if (typeConfig && typeConfig.coefficients) {
      Object.entries(typeConfig.coefficients).forEach(([deptId, coef]) => {
        departmentWeights[deptId] += areaRatio * coef;
      });
    } else {
      console.warn(`未找到空调类型配置: ${acTypeChinese} (${acTypeKey})`);
    }
  });
  
  // 计算权重总和（应该等于1）
  const totalWeight = Object.values(departmentWeights).reduce((sum, w) => sum + w, 0);
  
  // 根据权重分配工种奖金
  const allocations = {
    chief: {
      departmentName: '总负责',
      weight: chiefAlloc.chief,
      amount: Math.round(chiefAmount * 100) / 100
    }
  };
  
  cfg.departments.forEach(dept => {
    const weight = departmentWeights[dept.id];
    const amount = totalWeight > 0 ? (weight / totalWeight) * departmentsAmount : 0;
    allocations[dept.id] = {
      departmentName: dept.name,
      weight,
      amount: Math.round(amount * 100) / 100
    };
  });
  
  return {
    stage: stageName,
    stageAmount: Math.round(stageAmount * 100) / 100,
    chiefAmount: Math.round(chiefAmount * 100) / 100,
    departmentsAmount: Math.round(departmentsAmount * 100) / 100,
    allocations,
    totalAllocated: Math.round(stageAmount * 100) / 100,
    breakdown: airConditioningTable.map(item => ({
      acType: item.ac_type,
      acTypeName: cfg.airConditioningTypes[item.ac_type]?.name || item.ac_type,
      area: item.area,
      areaRatio: Math.round((item.area / totalArea) * 10000) / 100 // 百分比
    }))
  };
}

/**
 * 计算项目追加的增量提成
 * @param {Object} project - 原项目
 * @param {number} newBuildingArea - 追加后的新面积
 * @param {number} alreadyPaid - 已发放金额
 * @returns {Object} 包含新总额和增量提成
 */
function calculateAdditionCommission(project, newBuildingArea, alreadyPaid = 0) {
  // 计算追加后的新总额
  const newProject = { ...project, building_area: newBuildingArea };
  const result = calculateTotalCommission(newProject);
  const newTotalCommission = result.totalCommission;
  
  // 计算增量提成（新总额 - 已发放）
  const incrementalCommission = newTotalCommission - alreadyPaid;
  
  return {
    newTotalCommission: Math.round(newTotalCommission * 100) / 100,
    incrementalCommission: Math.round(incrementalCommission * 100) / 100,
    breakdown: result.breakdown
  };
}

/**
 * 验证计算结果
 * @param {number} commission - 提成金额
 * @returns {boolean}
 */
function validateCalculation(commission) {
  return typeof commission === 'number' && 
         commission >= 0 && 
         isFinite(commission);
}

/**
 * 获取配置信息
 * @returns {Object} 配置对象
 */
function getConfig() {
  return loadConfig();
}

module.exports = {
  calculateTotalCommission,
  calculateDepartmentAllocation,
  calculateAdditionCommission,
  validateCalculation,
  getConfig
};
