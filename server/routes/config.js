const express = require('express');
const router = express.Router();
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');
const { getConfigFull, updateConfigFull } = require('../utils/commission-full');

/**
 * 获取完整配置
 * GET /api/config
 */
router.get('/', authenticate, (req, res) => {
  try {
    const config = getConfigFull();
    res.json(config);
  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

/**
 * 更新基础参数
 * PUT /api/config/base-parameters
 */
router.put('/base-parameters', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { basePrice, commissionRatio } = req.body;
    
    if (basePrice === undefined || commissionRatio === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    const config = getConfigFull();
    config.baseParameters.basePrice = basePrice;
    config.baseParameters.commissionRatio = commissionRatio;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '基础参数更新成功',
      baseParameters: config.baseParameters
    });
  } catch (error) {
    console.error('更新基础参数错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新阶段分配比例
 * PUT /api/config/stage-allocation
 */
router.put('/stage-allocation', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { scheme, construction } = req.body;
    
    if (scheme === undefined || construction === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    if (scheme + construction !== 1.0) {
      return res.status(400).json({ error: '阶段分配比例之和必须等于1' });
    }
    
    const config = getConfigFull();
    config.stageAllocation.scheme = scheme;
    config.stageAllocation.construction = construction;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '阶段分配比例更新成功',
      stageAllocation: config.stageAllocation
    });
  } catch (error) {
    console.error('更新阶段分配比例错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新总负责分配比例
 * PUT /api/config/chief-allocation
 */
router.put('/chief-allocation', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { chief, departments } = req.body;
    
    if (chief === undefined || departments === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    if (Math.abs(chief + departments - 1.0) > 0.0001) {
      return res.status(400).json({ error: '总负责分配比例之和必须等于1' });
    }
    
    const config = getConfigFull();
    config.chiefAllocation.chief = chief;
    config.chiefAllocation.departments = departments;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '总负责分配比例更新成功',
      chiefAllocation: config.chiefAllocation
    });
  } catch (error) {
    console.error('更新总负责分配比例错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新项目规模系数
 * PUT /api/config/scale-coefficients
 */
router.put('/scale-coefficients', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { ranges } = req.body;
    
    if (!ranges || !Array.isArray(ranges)) {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const config = getConfigFull();
    config.scaleCoefficients.ranges = ranges;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '项目规模系数更新成功',
      scaleCoefficients: config.scaleCoefficients
    });
  } catch (error) {
    console.error('更新项目规模系数错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新建筑类型系数
 * PUT /api/config/building-type-coefficients
 */
router.put('/building-type-coefficients', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { types } = req.body;
    
    if (!types || typeof types !== 'object') {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const config = getConfigFull();
    config.buildingTypeCoefficients.types = types;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '建筑类型系数更新成功',
      buildingTypeCoefficients: config.buildingTypeCoefficients
    });
  } catch (error) {
    console.error('更新建筑类型系数错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新层高系数
 * PUT /api/config/height-coefficients
 */
router.put('/height-coefficients', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { ranges } = req.body;
    
    if (!ranges || !Array.isArray(ranges)) {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const config = getConfigFull();
    config.heightCoefficients.ranges = ranges;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '层高系数更新成功',
      heightCoefficients: config.heightCoefficients
    });
  } catch (error) {
    console.error('更新层高系数错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 更新空调类型系数
 * PUT /api/config/air-conditioning-types
 */
router.put('/air-conditioning-types', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const { airConditioningTypes } = req.body;
    
    if (!airConditioningTypes || typeof airConditioningTypes !== 'object') {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const config = getConfigFull();
    config.airConditioningTypes = airConditioningTypes;
    config.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(config);
    
    res.json({
      message: '空调类型系数更新成功',
      airConditioningTypes: config.airConditioningTypes
    });
  } catch (error) {
    console.error('更新空调类型系数错误:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 重置配置为默认值
 * POST /api/config/reset
 */
router.post('/reset', authenticate, requireAdminOrFinance, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 读取默认配置
    const defaultConfigPath = path.join(__dirname, '../config/commission-config-full.json');
    const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
    
    // 更新最后修改时间
    defaultConfig.lastUpdated = new Date().toISOString().split('T')[0];
    
    updateConfigFull(defaultConfig);
    
    res.json({
      message: '配置已重置为默认值',
      config: defaultConfig
    });
  } catch (error) {
    console.error('重置配置错误:', error);
    res.status(500).json({ error: '重置失败' });
  }
});

module.exports = router;
