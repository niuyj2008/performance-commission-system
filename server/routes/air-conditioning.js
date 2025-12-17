const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');
const { calculateDepartmentAllocation } = require('../utils/commission');

/**
 * 获取项目的空调面积表
 * GET /api/air-conditioning/:projectId
 */
router.get('/:projectId', authenticate, (req, res) => {
  const { projectId } = req.params;
  
  db.all(
    'SELECT * FROM air_conditioning_tables WHERE project_id = ? ORDER BY id',
    [projectId],
    (err, records) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ tables: records });
    }
  );
});

/**
 * 批量保存空调面积表
 * POST /api/air-conditioning/:projectId
 */
router.post('/:projectId', authenticate, requireAdminOrFinance, async (req, res) => {
  const { projectId } = req.params;
  const { tables } = req.body;
  
  if (!tables || !Array.isArray(tables)) {
    return res.status(400).json({ error: '请提供空调面积表数据' });
  }
  
  // 验证项目是否存在
  db.get('SELECT id FROM projects WHERE id = ?', [projectId], async (err, project) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    try {
      // 删除该项目的所有旧记录
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM air_conditioning_tables WHERE project_id = ?', [projectId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // 插入新记录
      for (const table of tables) {
        if (!table.ac_type || !table.area || table.area <= 0) {
          continue; // 跳过无效记录
        }
        
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO air_conditioning_tables (project_id, ac_type, location, area, notes) VALUES (?, ?, ?, ?, ?)',
            [projectId, table.ac_type, table.location || null, table.area, table.notes || null],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      
      res.json({
        message: '空调面积表保存成功',
        count: tables.length
      });
      
    } catch (error) {
      console.error('保存空调面积表失败:', error);
      res.status(500).json({ error: '保存失败' });
    }
  });
});

/**
 * 更新空调面积记录
 * PUT /api/air-conditioning/record/:recordId
 */
router.put('/record/:recordId', authenticate, requireAdminOrFinance, (req, res) => {
  const { recordId } = req.params;
  const { ac_type, area, notes } = req.body;
  
  const updates = [];
  const params = [];
  
  if (ac_type) {
    updates.push('ac_type = ?');
    params.push(ac_type);
  }
  if (area !== undefined) {
    updates.push('area = ?');
    params.push(area);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }
  
  params.push(recordId);
  
  db.run(
    `UPDATE air_conditioning_tables SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '记录不存在' });
      }
      
      res.json({ message: '空调面积记录更新成功' });
    }
  );
});

/**
 * 删除空调面积记录
 * DELETE /api/air-conditioning/record/:recordId
 */
router.delete('/record/:recordId', authenticate, requireAdminOrFinance, (req, res) => {
  const { recordId } = req.params;
  
  db.run('DELETE FROM air_conditioning_tables WHERE id = ?', [recordId], function(err) {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    res.json({ message: '空调面积记录删除成功' });
  });
});

/**
 * 计算项目的部门分配
 * POST /api/air-conditioning/:projectId/calculate-allocation
 */
router.post('/:projectId/calculate-allocation', authenticate, (req, res) => {
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
    
    if (!project.calculated_commission) {
      return res.status(400).json({ error: '请先计算项目提成总额' });
    }
    
    // 获取空调面积表
    db.all(
      'SELECT * FROM air_conditioning_tables WHERE project_id = ?',
      [projectId],
      (err, acTable) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        if (!acTable || acTable.length === 0) {
          return res.status(400).json({ error: '请先添加空调面积表数据' });
        }
        
        try {
          // 计算部门分配（需要传入设计阶段）
          const result = calculateDepartmentAllocation(
            project.calculated_commission,
            project.stage || 'construction',
            acTable
          );
          
          // 保存部门分配结果
          const allocations = result.allocations;
          const insertPromises = [];
          
          for (const [deptId, allocation] of Object.entries(allocations)) {
            insertPromises.push(
              new Promise((resolve, reject) => {
                db.run(
                  `INSERT OR REPLACE INTO department_allocations 
                   (project_id, department_id, allocated_amount, allocation_weight) 
                   VALUES (?, ?, ?, ?)`,
                  [projectId, deptId, allocation.amount, allocation.weight],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              })
            );
          }
          
          Promise.all(insertPromises)
            .then(() => {
              res.json({
                message: '部门分配计算成功',
                projectId: parseInt(projectId),
                projectName: project.name,
                totalCommission: project.calculated_commission,
                stage: result.stage,
                stageAmount: result.stageAmount,
                chiefAmount: result.chiefAmount,
                departmentsAmount: result.departmentsAmount,
                allocations: result.allocations,
                totalAllocated: result.totalAllocated,
                breakdown: result.breakdown
              });
            })
            .catch((err) => {
              console.error('数据库错误:', err);
              res.status(500).json({ error: '保存分配结果失败' });
            });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      }
    );
  });
});

/**
 * 获取项目的部门分配结果
 * GET /api/air-conditioning/:projectId/allocations
 */
router.get('/:projectId/allocations', authenticate, (req, res) => {
  const { projectId } = req.params;
  
  db.all(
    'SELECT * FROM department_allocations WHERE project_id = ? ORDER BY allocated_amount DESC',
    [projectId],
    (err, allocations) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ allocations });
    }
  );
});

module.exports = router;
