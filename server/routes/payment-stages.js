const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');

/**
 * 获取项目的发放阶段列表
 * GET /api/payment-stages/:projectId
 */
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const stages = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM payment_stages 
         WHERE project_id = ? 
         ORDER BY stage_date ASC, id ASC`,
        [projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    // 检查每个阶段是否已被使用（是否有员工分配关联）
    for (const stage of stages) {
      // 获取使用次数
      const usageCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM employee_distributions 
           WHERE payment_stage_id = ?`,
          [stage.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
          }
        );
      });
      
      // 获取已发放金额
      const paidAmount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COALESCE(SUM(amount), 0) as total FROM employee_distributions 
           WHERE payment_stage_id = ?`,
          [stage.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.total : 0);
          }
        );
      });
      
      // 按部门统计已发放金额
      const paidByDepartment = await new Promise((resolve, reject) => {
        db.all(
          `SELECT department_id, COALESCE(SUM(amount), 0) as total 
           FROM employee_distributions 
           WHERE payment_stage_id = ? 
           GROUP BY department_id`,
          [stage.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      stage.is_used = usageCount > 0;
      stage.usage_count = usageCount;
      stage.paid_amount = paidAmount;
      stage.paid_by_department = {};
      
      // 转换为对象格式
      paidByDepartment.forEach(dept => {
        stage.paid_by_department[dept.department_id] = dept.total;
      });
    }
    
    // 计算项目总计已发放金额（所有发放节点的总和）
    const totalPaidAmount = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM employee_distributions 
         WHERE project_id = ?`,
        [projectId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.total : 0);
        }
      );
    });
    
    // 按部门统计项目总计已发放金额
    const totalPaidByDepartment = await new Promise((resolve, reject) => {
      db.all(
        `SELECT department_id, COALESCE(SUM(amount), 0) as total 
         FROM employee_distributions 
         WHERE project_id = ? 
         GROUP BY department_id`,
        [projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    const totalPaidByDept = {};
    totalPaidByDepartment.forEach(dept => {
      totalPaidByDept[dept.department_id] = dept.total;
    });
    
    res.json({ 
      stages,
      total_paid_amount: totalPaidAmount,
      total_paid_by_department: totalPaidByDept
    });
  } catch (error) {
    console.error('获取发放阶段失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 创建或更新发放阶段
 * POST /api/payment-stages/:projectId
 */
router.post('/:projectId', authenticate, requireAdminOrFinance, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { stages } = req.body;
    
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ error: '请提供发放阶段数据' });
    }
    
    // 检查是否有已使用的发放节点
    const existingStages = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM payment_stages WHERE project_id = ?',
        [projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    // 检查每个现有阶段是否已被使用
    for (const existingStage of existingStages) {
      const usageCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM employee_distributions 
           WHERE payment_stage_id = ?`,
          [existingStage.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
          }
        );
      });
      
      if (usageCount > 0) {
        // 检查新数据中是否保留了这个已使用的节点
        const isPreserved = stages.some(s => 
          s.id === existingStage.id &&
          s.stage_date === existingStage.stage_date &&
          s.stage_name === existingStage.stage_name &&
          Math.abs(s.current_ratio - existingStage.current_ratio) < 0.0001
        );
        
        if (!isPreserved) {
          return res.status(400).json({ 
            error: `发放节点"${existingStage.stage_date} - ${existingStage.stage_name}"已被使用（${usageCount}条分配记录），不允许修改或删除` 
          });
        }
      }
    }
    
    // 验证比例总和
    let cumulativeRatio = 0;
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      if (!stage.stage_date || !stage.stage_name || stage.current_ratio === undefined) {
        return res.status(400).json({ error: '阶段信息不完整' });
      }
      
      if (stage.current_ratio < 0 || stage.current_ratio > 1) {
        return res.status(400).json({ error: '发放比例必须在0-100%之间' });
      }
      
      cumulativeRatio += stage.current_ratio;
      
      // 验证累计比例
      if (Math.abs(stage.total_ratio - cumulativeRatio) > 0.0001) {
        return res.status(400).json({ 
          error: `第${i + 1}个阶段的总比例计算错误` 
        });
      }
    }
    
    // 删除项目的所有旧阶段（只删除未使用的）
    for (const existingStage of existingStages) {
      const usageCount = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM employee_distributions 
           WHERE payment_stage_id = ?`,
          [existingStage.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
          }
        );
      });
      
      // 只删除未使用的节点
      if (usageCount === 0) {
        await new Promise((resolve, reject) => {
          db.run(
            'DELETE FROM payment_stages WHERE id = ?',
            [existingStage.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }
    
    // 插入或更新阶段
    for (const stage of stages) {
      if (stage.id) {
        // 更新现有阶段（只更新未使用的字段）
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE payment_stages 
             SET stage_date = ?, stage_name = ?, previous_ratio = ?, 
                 current_ratio = ?, total_ratio = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND project_id = ?`,
            [
              stage.stage_date,
              stage.stage_name,
              stage.previous_ratio || 0,
              stage.current_ratio,
              stage.total_ratio,
              stage.notes || null,
              stage.id,
              projectId
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        // 插入新阶段
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO payment_stages 
             (project_id, stage_date, stage_name, previous_ratio, current_ratio, total_ratio, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              projectId,
              stage.stage_date,
              stage.stage_name,
              stage.previous_ratio || 0,
              stage.current_ratio,
              stage.total_ratio,
              stage.notes || null
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }
    
    res.json({ 
      message: '发放阶段保存成功',
      count: stages.length
    });
  } catch (error) {
    console.error('保存发放阶段失败:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

/**
 * 删除发放阶段
 * DELETE /api/payment-stages/:projectId/:stageId
 */
router.delete('/:projectId/:stageId', authenticate, requireAdminOrFinance, async (req, res) => {
  try {
    const { projectId, stageId } = req.params;
    
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM payment_stages WHERE id = ? AND project_id = ?',
        [stageId, projectId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ message: '发放阶段删除成功' });
  } catch (error) {
    console.error('删除发放阶段失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
