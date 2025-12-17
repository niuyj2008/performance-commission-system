/**
 * 提成计算工具 - 完整版
 * 支持所有系数的配置化计算
 * 基于韶谷数码城项目奖金发放计算表(20200629)
 */

const fs = require('fs');
const path = require('path');

// 加载配置
let config = null;
function loadConfig() {
  if (!config) {
    const configPath = path.join(__dirname, '../config/commission-config-full.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  }
  return config;
}

/**
 * 根据面积获取项目规模系数
 */
function getScaleCoefficient(area) {
  const cfg = loadConfig().scaleCoefficients;
  for (const range of cfg.ranges) {
    if (area >= range.minArea && area <= range.maxArea) {
      return {
        name: range.name,
        coefficient: range.coefficient
      };
    }
  }
  return { name: '未知', coefficient: 1.0 };
}

/**
 * 根据建筑类型获取工程类别系数
 */
function getBuildingTypeCoefficient(buildingType) {
  const cfg = loadConfig().buildingTypeCoefficients;
  const typeConfig = cfg.types[buildingType] || cfg.types.other;
  return {
    name: typeConfig.name,
    coefficient: typeConfig.coefficient
  };
}

/**
 * 根据楼层数获取层高系数
 */
function getHeightCoefficient(floors) {
  const cfg = loadConfig().heightCoefficients;
  for (const range of cfg.ranges) {
    if (floors >= range.minFloors && floors <= range.maxFloors) {
      return {
        name: range.name,
        coefficient: range.coefficient
      };
    }
  }
  return { name: '未知', coefficient: 1.0 };
}

/**
 * 根据建筑形式获取系数
 */
function getFormCoefficient(form) {
  const cfg = loadConfig().formCoefficients;
  const formConfig = cfg.types[form] || cfg.types.single;
  return {
    name: formConfig.name,
    coefficient: formConfig.coefficient
  };
}

/**
 * 根据裙楼面积比获取系数
 */
function getPodiumRatioCoefficient(ratio) {
  const cfg = loadConfig().podiumRatioCoefficients;
  for (const range of cfg.ranges) {
    if (ratio >= range.minRatio && ratio <= range.maxRatio) {
      return {
        name: range.name,
        coefficient: range.coefficient
      };
    }
  }
  return { name: '未知', coefficient: 1.0 };
}

/**
 * 根据地下室面积比获取系数
 */
function getBasementRatioCoefficient(ratio) {
  const cfg = loadConfig().basementRatioCoefficients;
  for (const range of cfg.ranges) {
    if (ratio >= range.minRatio && ratio <= range.maxRatio) {
      return {
        name: range.name,
        coefficient: range.coefficient
      };
    }
  }
  return { name: '未知', coefficient: 1.0 };
}

/**
 * 第一级：根据建筑属性计算项目提成总额（完整版）
 * @param {Object} project - 项目对象
 * @param {number} project.building_area - 建筑面积
 * @param {string} project.building_type - 建筑类型
 * @param {number} project.floors - 楼层数
 * @param {string} project.form - 建筑形式 ('single' 或 'complex')
 * @param {number} project.podium_ratio - 裙楼面积比 (0-1)
 * @param {number} project.basement_ratio - 地下室面积比 (0-1)
 * @param {Object} project.attributes - 特殊属性
 * @returns {Object} 包含总额和计算明细
 */
function calculateTotalCommissionFull(project) {
  const {
    building_area,
    building_type = 'other',
    floors = 1,
    form = 'single',
    podium_ratio = 0,
    basement_ratio = 0,
    attributes = {}
  } = project;
  
  if (!building_area || building_area <= 0) {
    throw new Error('建筑面积无效');
  }
  
  const cfg = loadConfig();
  const baseParams = cfg.baseParameters;
  
  // 1. 获取基础参数
  const basePrice = baseParams.basePrice;
  const commissionRatio = baseParams.commissionRatio;
  
  // 2. 获取各项系数
  const scaleCoef = getScaleCoefficient(building_area);
  const typeCoef = getBuildingTypeCoefficient(building_type);
  const heightCoef = getHeightCoefficient(floors);
  const formCoef = getFormCoefficient(form);
  const podiumCoef = getPodiumRatioCoefficient(podium_ratio);
  const basementCoef = getBasementRatioCoefficient(basement_ratio);
  
  // 3. 计算特殊属性加成
  let attributeBonus = 0;
  const appliedAttributes = [];
  
  for (const [attrKey, attrValue] of Object.entries(attributes)) {
    if (attrValue && cfg.specialAttributes[attrKey]) {
      const bonus = cfg.specialAttributes[attrKey].bonus;
      if (bonus > 0) {
        attributeBonus += bonus;
        appliedAttributes.push(cfg.specialAttributes[attrKey].name);
      }
    }
  }
  
  // 4. 计算提成单价
  // 公式：计算基价 × 提成比例 × 项目规模系数 × 工程类别系数 × 层高系数 × 建筑形式系数 × 裙楼面积比系数 × 地下室面积比系数
  const unitPrice = basePrice * commissionRatio * 
                    scaleCoef.coefficient * 
                    typeCoef.coefficient * 
                    heightCoef.coefficient * 
                    formCoef.coefficient * 
                    podiumCoef.coefficient * 
                    basementCoef.coefficient;
  
  // 5. 计算总提成
  const baseCommission = unitPrice * building_area;
  const totalCommission = baseCommission * (1 + attributeBonus);
  
  return {
    totalCommission: Math.round(totalCommission * 100) / 100,
    breakdown: {
      buildingArea: building_area,
      basePrice,
      commissionRatio,
      scaleCoefficient: {
        name: scaleCoef.name,
        value: scaleCoef.coefficient
      },
      buildingTypeCoefficient: {
        name: typeCoef.name,
        value: typeCoef.coefficient
      },
      heightCoefficient: {
        name: heightCoef.name,
        value: heightCoef.coefficient
      },
      formCoefficient: {
        name: formCoef.name,
        value: formCoef.coefficient
      },
      podiumRatioCoefficient: {
        name: podiumCoef.name,
        value: podiumCoef.coefficient
      },
      basementRatioCoefficient: {
        name: basementCoef.name,
        value: basementCoef.coefficient
      },
      unitPrice: Math.round(unitPrice * 1000000) / 1000000,
      baseCommission: Math.round(baseCommission * 100) / 100,
      attributeBonus,
      appliedAttributes
    }
  };
}

/**
 * 第二级：根据空调面积表计算部门分配
 * @param {number} totalCommission - 项目提成总额
 * @param {string} stage - 设计阶段 ('scheme' 或 'construction')
 * @param {Array} airConditioningTable - 空调面积表数据
 * @returns {Object} 各部门分配金额（包括总负责和各工种）
 */
function calculateDepartmentAllocationFull(totalCommission, stage, airConditioningTable) {
  const config = loadConfig();
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
  config.departments.forEach(dept => {
    departmentWeights[dept.id] = 0;
  });
  
  // 根据每种空调类型的面积和系数，累加各部门的权重
  airConditioningTable.forEach(item => {
    const acType = item.ac_type;
    const area = item.area || 0;
    const areaRatio = area / totalArea;
    
    const typeConfig = config.airConditioningTypes[acType];
    if (typeConfig && typeConfig.coefficients) {
      Object.entries(typeConfig.coefficients).forEach(([deptId, coef]) => {
        departmentWeights[deptId] += areaRatio * coef;
      });
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
  
  config.departments.forEach(dept => {
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
      acTypeName: config.airConditioningTypes[item.ac_type]?.name || item.ac_type,
      area: item.area,
      areaRatio: Math.round((item.area / totalArea) * 10000) / 100 // 百分比
    }))
  };
}

/**
 * 获取配置信息
 * @returns {Object} 配置对象
 */
function getConfigFull() {
  return loadConfig();
}

/**
 * 更新配置信息
 * @param {Object} newConfig - 新的配置对象
 */
function updateConfigFull(newConfig) {
  const configPath = path.join(__dirname, '../config/commission-config-full.json');
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
  config = null; // 清除缓存
}

module.exports = {
  calculateTotalCommissionFull,
  calculateDepartmentAllocationFull,
  getConfigFull,
  updateConfigFull,
  getScaleCoefficient,
  getBuildingTypeCoefficient,
  getHeightCoefficient,
  getFormCoefficient,
  getPodiumRatioCoefficient,
  getBasementRatioCoefficient
};
