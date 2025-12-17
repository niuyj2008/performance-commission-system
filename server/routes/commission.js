const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');
const { calculateTotalCommission, calculateAdditionCommission } = require('../utils/commission');

/**
 * 计算项目提成
 * POST /api/commission/calculate/:projectId
 */
router.post('/calculate/:projectId', authenticate, (req, res) => {
  const { projectId } = req.params;
  
  // 获取项目信息
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    try {
      // 构建项目属性对象
      const projectData = {
        building_area: project.building_area,
        building_type: project.building_type || 'other',
        stage: project.stage || 'construction',
        attributes: {
          hasBasement: project.has_basement === 1,
          hasCivilDefense: project.has_civil_defense === 1,
          isGreenBuilding: project.is_green_building === 1,
          isPrefabricated: project.is_prefabricated === 1,
          isReportingProject: project.is_reporting_project === 1,
          isReviewProject: project.is_review_project === 1
        }
      };
      
      // 计算提成总额
      const result = calculateTotalCommission(projectData);
      
      // 更新项目的提成金额
      db.run(
        'UPDATE projects SET calculated_commission = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [result.totalCommission, projectId],
        (err) => {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          res.json({
            message: '提成计算成功',
            projectId: parseInt(projectId),
            projectName: project.name,
            totalCommission: result.totalCommission,
            breakdown: result.breakdown
          });
        }
      );
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
});

/**
 * 计算项目追加提成
 * POST /api/commission/calculate-addition/:projectId
 */
router.post('/calculate-addition/:projectId', authenticate, requireAdminOrFinance, (req, res) => {
  const { projectId } = req.params;
  const { newBuildingArea } = req.body;
  
  if (!newBuildingArea || newBuildingArea <= 0) {
    return res.status(400).json({ error: '新建筑面积无效' });
  }
  
  // 获取项目信息
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 获取已发放金额
    db.get(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payment_records WHERE project_id = ?',
      [projectId],
      (err, result) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        const alreadyPaid = result.total_paid;
        
        try {
          // 构建项目数据
          const projectData = {
            building_area: project.building_area,
            building_type: project.building_type || 'other',
            stage: project.stage || 'construction',
            attributes: {
              hasBasement: project.has_basement === 1,
              hasCivilDefense: project.has_civil_defense === 1,
              isGreenBuilding: project.is_green_building === 1,
              isPrefabricated: project.is_prefabricated === 1,
              isReportingProject: project.is_reporting_project === 1,
              isReviewProject: project.is_review_project === 1
            }
          };
          
          // 计算追加提成
          const result = calculateAdditionCommission(
            projectData,
            newBuildingArea,
            alreadyPaid
          );
          
          res.json({
            message: '追加提成计算成功',
            projectId: parseInt(projectId),
            projectName: project.name,
            originalArea: project.building_area,
            newArea: newBuildingArea,
            areaChange: newBuildingArea - project.building_area,
            originalCommission: project.calculated_commission,
            newTotalCommission: result.newTotalCommission,
            alreadyPaid,
            incrementalCommission: result.incrementalCommission,
            breakdown: result.breakdown
          });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      }
    );
  });
});

/**
 * 获取项目提成详情
 * GET /api/commission/:projectId
 */
router.get('/:projectId', authenticate, (req, res) => {
  const { projectId } = req.params;
  
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 获取已发放金额
    db.get(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payment_records WHERE project_id = ?',
      [projectId],
      (err, paymentResult) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        const totalPaid = paymentResult.total_paid;
        const remaining = project.calculated_commission - totalPaid;
        
        res.json({
          projectId: project.id,
          projectName: project.name,
          buildingArea: project.building_area,
          stage: project.stage,
          totalCommission: project.calculated_commission,
          totalPaid,
          remaining: Math.max(0, remaining),
          hasAddition: project.has_addition === 1
        });
      }
    );
  });
});

module.exports = router;
