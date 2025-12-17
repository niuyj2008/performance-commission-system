const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');

/**
 * 获取部门在某项目的可分配金额
 * GET /api/department-distribution/:projectId/:departmentId
 */
router.get('/:projectId/:departmentId', authenticate, (req, res) => {
  const { projectId, departmentId } = req.params;
  
  // 获取部门分配金额
  db.get(
    'SELECT * FROM department_allocations WHERE project_id = ? AND department_id = ?',
    [projectId, departmentId],
    (err, allocation) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (!allocation) {
        return res.status(404).json({ error: '未找到部门分配记录' });
      }
      
      // 获取已分配给员工的金额
      db.get(
        'SELECT COALESCE(SUM(amount), 0) as distributed FROM employee_distributions WHERE project_id = ? AND department_id = ?',
        [projectId, departmentId],
        (err, result) => {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          const distributed = result.distributed;
          const remaining = allocation.allocated_amount - distributed;
          
          res.json({
            projectId: parseInt(projectId),
            departmentId,
            allocatedAmount: allocation.allocated_amount,
            distributedAmount: distributed,
            remainingAmount: remaining
          });
        }
      );
    }
  );
});

/**
 * 获取部门内员工分配列表
 * GET /api/department-distribution/:projectId/:departmentId/employees
 */
router.get('/:projectId/:departmentId/employees', authenticate, (req, res) => {
  const { projectId, departmentId } = req.params;
  
  db.all(
    `SELECT ed.*, u.username, u.name as employee_name 
     FROM employee_distributions ed
     JOIN users u ON ed.employee_id = u.id
     WHERE ed.project_id = ? AND ed.department_id = ?
     ORDER BY ed.amount DESC`,
    [projectId, departmentId],
    (err, distributions) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ distributions });
    }
  );
});

/**
 * 添加或更新员工分配
 * POST /api/department-distribution/:projectId/:departmentId/distribute
 */
router.post('/:projectId/:departmentId/distribute', authenticate, requireAdminOrFinance, (req, res) => {
  const { projectId, departmentId } = req.params;
  const { employeeId, amount, notes } = req.body;
  
  if (!employeeId || amount === undefined || amount < 0) {
    return res.status(400).json({ error: '员工ID和金额不能为空' });
  }
  
  // 验证员工是否属于该部门
  db.get(
    'SELECT * FROM users WHERE id = ? AND department_id = (SELECT id FROM departments WHERE code = ?)',
    [employeeId, departmentId],
    (err, user) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (!user) {
        return res.status(400).json({ error: '员工不属于该部门' });
      }
      
      // 获取部门可分配金额
      db.get(
        'SELECT allocated_amount FROM department_allocations WHERE project_id = ? AND department_id = ?',
        [projectId, departmentId],
        (err, allocation) => {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          if (!allocation) {
            return res.status(400).json({ error: '未找到部门分配记录，请先计算部门分配' });
          }
          
          // 获取已分配金额（排除当前员工）
          db.get(
            'SELECT COALESCE(SUM(amount), 0) as distributed FROM employee_distributions WHERE project_id = ? AND department_id = ? AND employee_id != ?',
            [projectId, departmentId, employeeId],
            (err, result) => {
              if (err) {
                console.error('数据库错误:', err);
                return res.status(500).json({ error: '服务器错误' });
              }
              
              const otherDistributed = result.distributed;
              const available = allocation.allocated_amount - otherDistributed;
              
              if (amount > available) {
                return res.status(400).json({ 
                  error: '分配金额超出可用额度',
                  available,
                  requested: amount
                });
              }
              
              // 插入或更新分配记录
              db.run(
                `INSERT INTO employee_distributions (project_id, department_id, employee_id, amount, notes)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(project_id, department_id, employee_id) 
                 DO UPDATE SET amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP`,
                [projectId, departmentId, employeeId, amount, notes || null, amount, notes || null],
                function(err) {
                  if (err) {
                    console.error('数据库错误:', err);
                    return res.status(500).json({ error: '服务器错误' });
                  }
                  
                  res.json({
                    message: '员工分配成功',
                    employeeId,
                    amount,
                    remaining: available - amount
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

/**
 * 批量分配员工提成
 * POST /api/department-distribution/:projectId/:departmentId/batch-distribute
 */
router.post('/:projectId/:departmentId/batch-distribute', authenticate, requireAdminOrFinance, (req, res) => {
  const { projectId, departmentId } = req.params;
  const { distributions } = req.body; // [{ employeeId, amount, notes }]
  
  if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
    return res.status(400).json({ error: '分配数据不能为空' });
  }
  
  // 获取部门可分配金额
  db.get(
    'SELECT allocated_amount FROM department_allocations WHERE project_id = ? AND department_id = ?',
    [projectId, departmentId],
    (err, allocation) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (!allocation) {
        return res.status(400).json({ error: '未找到部门分配记录' });
      }
      
      // 计算总分配金额
      const totalAmount = distributions.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      if (totalAmount > allocation.allocated_amount) {
        return res.status(400).json({ 
          error: '总分配金额超出可用额度',
          available: allocation.allocated_amount,
          requested: totalAmount
        });
      }
      
      // 先删除该部门在该项目的所有分配
      db.run(
        'DELETE FROM employee_distributions WHERE project_id = ? AND department_id = ?',
        [projectId, departmentId],
        (err) => {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          // 批量插入新分配
          const insertPromises = distributions.map(d => {
            return new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO employee_distributions (project_id, department_id, employee_id, amount, notes) VALUES (?, ?, ?, ?, ?)',
                [projectId, departmentId, d.employeeId, d.amount, d.notes || null],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });
          
          Promise.all(insertPromises)
            .then(() => {
              res.json({
                message: '批量分配成功',
                count: distributions.length,
                totalAmount,
                remaining: allocation.allocated_amount - totalAmount
              });
            })
            .catch((err) => {
              console.error('数据库错误:', err);
              res.status(500).json({ error: '批量分配失败' });
            });
        }
      );
    }
  );
});

/**
 * 删除员工分配
 * DELETE /api/department-distribution/:projectId/:departmentId/employee/:employeeId
 */
router.delete('/:projectId/:departmentId/employee/:employeeId', authenticate, requireAdminOrFinance, (req, res) => {
  const { projectId, departmentId, employeeId } = req.params;
  
  db.run(
    'DELETE FROM employee_distributions WHERE project_id = ? AND department_id = ? AND employee_id = ?',
    [projectId, departmentId, employeeId],
    function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '分配记录不存在' });
      }
      
      res.json({ message: '员工分配删除成功' });
    }
  );
});

/**
 * 获取员工在所有项目的提成汇总
 * GET /api/department-distribution/employee/:employeeId/summary
 */
router.get('/employee/:employeeId/summary', authenticate, (req, res) => {
  const { employeeId } = req.params;
  const { period } = req.query;
  
  let query = `
    SELECT 
      ed.*,
      p.code as project_code,
      p.name as project_name,
      p.period
    FROM employee_distributions ed
    JOIN projects p ON ed.project_id = p.id
    WHERE ed.employee_id = ?
  `;
  
  const params = [employeeId];
  
  if (period) {
    query += ' AND p.period = ?';
    params.push(period);
  }
  
  query += ' ORDER BY p.period DESC, ed.amount DESC';
  
  db.all(query, params, (err, distributions) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
    
    res.json({
      employeeId: parseInt(employeeId),
      distributions,
      totalAmount,
      count: distributions.length
    });
  });
});

module.exports = router;
