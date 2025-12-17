const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');

/**
 * 创建发放记录
 * POST /api/payment/records
 */
router.post('/records', authenticate, requireAdminOrFinance, (req, res) => {
  const { project_id, user_id, amount, payment_date, payment_batch, notes } = req.body;
  
  if (!project_id || !user_id || !amount || !payment_date) {
    return res.status(400).json({ error: '项目、员工、金额和发放日期不能为空' });
  }
  
  db.run(
    `INSERT INTO payment_records (project_id, user_id, amount, payment_date, payment_batch, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [project_id, user_id, amount, payment_date, payment_batch || null, notes || null, req.user.id],
    function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.status(201).json({
        message: '发放记录创建成功',
        recordId: this.lastID
      });
    }
  );
});

/**
 * 批量创建发放记录
 * POST /api/payment/records/batch
 */
router.post('/records/batch', authenticate, requireAdminOrFinance, (req, res) => {
  const { records, payment_batch } = req.body;
  
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '发放记录不能为空' });
  }
  
  const insertPromises = records.map(record => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payment_records (project_id, user_id, amount, payment_date, payment_batch, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.project_id,
          record.user_id,
          record.amount,
          record.payment_date,
          payment_batch || null,
          record.notes || null,
          req.user.id
        ],
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
        message: '批量发放记录创建成功',
        count: records.length
      });
    })
    .catch((err) => {
      console.error('数据库错误:', err);
      res.status(500).json({ error: '批量创建失败' });
    });
});

/**
 * 获取发放记录列表
 * GET /api/payment/records
 */
router.get('/records', authenticate, (req, res) => {
  const { project_id, user_id, period, payment_batch } = req.query;
  
  let query = `
    SELECT 
      pr.*,
      p.name as project_name,
      p.code as project_code,
      p.period,
      u.username,
      u.name as user_name,
      d.name as department_name,
      creator.name as created_by_name
    FROM payment_records pr
    JOIN projects p ON pr.project_id = p.id
    JOIN users u ON pr.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN users creator ON pr.created_by = creator.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (project_id) {
    query += ' AND pr.project_id = ?';
    params.push(project_id);
  }
  
  if (user_id) {
    query += ' AND pr.user_id = ?';
    params.push(user_id);
  }
  
  if (period) {
    query += ' AND p.period = ?';
    params.push(period);
  }
  
  if (payment_batch) {
    query += ' AND pr.payment_batch = ?';
    params.push(payment_batch);
  }
  
  // 部门经理只能看到本部门的发放记录
  if (req.user.role === 'manager') {
    query += ' AND u.department_id = (SELECT department_id FROM users WHERE id = ?)';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY pr.payment_date DESC, pr.created_at DESC';
  
  db.all(query, params, (err, records) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    res.json({ records });
  });
});

/**
 * 获取员工发放汇总
 * GET /api/payment/summary/employee/:userId
 */
router.get('/summary/employee/:userId', authenticate, (req, res) => {
  const { userId } = req.params;
  const { period } = req.query;
  
  // 部门经理只能查看本部门员工
  if (req.user.role === 'manager') {
    db.get(
      'SELECT department_id FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: '员工不存在' });
        }
        
        db.get(
          'SELECT department_id FROM users WHERE id = ?',
          [req.user.id],
          (err, manager) => {
            if (err || user.department_id !== manager.department_id) {
              return res.status(403).json({ error: '无权查看其他部门员工' });
            }
            
            getEmployeeSummary(userId, period, res);
          }
        );
      }
    );
  } else {
    getEmployeeSummary(userId, period, res);
  }
});

function getEmployeeSummary(userId, period, res) {
  let query = `
    SELECT 
      pr.project_id,
      p.name as project_name,
      p.code as project_code,
      p.period,
      SUM(pr.amount) as total_amount,
      COUNT(pr.id) as payment_count,
      MIN(pr.payment_date) as first_payment_date,
      MAX(pr.payment_date) as last_payment_date
    FROM payment_records pr
    JOIN projects p ON pr.project_id = p.id
    WHERE pr.user_id = ?
  `;
  
  const params = [userId];
  
  if (period) {
    query += ' AND p.period = ?';
    params.push(period);
  }
  
  query += ' GROUP BY pr.project_id ORDER BY p.period DESC, p.created_at DESC';
  
  db.all(query, params, (err, projects) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    // 获取总计
    let totalQuery = `
      SELECT 
        SUM(pr.amount) as grand_total,
        COUNT(DISTINCT pr.project_id) as project_count,
        COUNT(pr.id) as total_payments
      FROM payment_records pr
      JOIN projects p ON pr.project_id = p.id
      WHERE pr.user_id = ?
    `;
    
    const totalParams = [userId];
    
    if (period) {
      totalQuery += ' AND p.period = ?';
      totalParams.push(period);
    }
    
    db.get(totalQuery, totalParams, (err, total) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({
        userId: parseInt(userId),
        period: period || '全部',
        projects,
        summary: {
          grandTotal: total.grand_total || 0,
          projectCount: total.project_count || 0,
          totalPayments: total.total_payments || 0
        }
      });
    });
  });
}

/**
 * 获取部门发放汇总
 * GET /api/payment/summary/department/:departmentId
 */
router.get('/summary/department/:departmentId', authenticate, (req, res) => {
  const { departmentId } = req.params;
  const { period } = req.query;
  
  // 部门经理只能查看本部门
  if (req.user.role === 'manager') {
    db.get(
      'SELECT department_id FROM users WHERE id = ?',
      [req.user.id],
      (err, manager) => {
        if (err || manager.department_id != departmentId) {
          return res.status(403).json({ error: '无权查看其他部门' });
        }
        
        getDepartmentSummary(departmentId, period, res);
      }
    );
  } else {
    getDepartmentSummary(departmentId, period, res);
  }
});

function getDepartmentSummary(departmentId, period, res) {
  let query = `
    SELECT 
      u.id as user_id,
      u.username,
      u.name as user_name,
      SUM(pr.amount) as total_amount,
      COUNT(DISTINCT pr.project_id) as project_count,
      COUNT(pr.id) as payment_count
    FROM payment_records pr
    JOIN projects p ON pr.project_id = p.id
    JOIN users u ON pr.user_id = u.id
    WHERE u.department_id = ?
  `;
  
  const params = [departmentId];
  
  if (period) {
    query += ' AND p.period = ?';
    params.push(period);
  }
  
  query += ' GROUP BY u.id ORDER BY total_amount DESC';
  
  db.all(query, params, (err, employees) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    // 获取部门总计
    let totalQuery = `
      SELECT 
        SUM(pr.amount) as grand_total,
        COUNT(DISTINCT pr.user_id) as employee_count,
        COUNT(DISTINCT pr.project_id) as project_count
      FROM payment_records pr
      JOIN projects p ON pr.project_id = p.id
      JOIN users u ON pr.user_id = u.id
      WHERE u.department_id = ?
    `;
    
    const totalParams = [departmentId];
    
    if (period) {
      totalQuery += ' AND p.period = ?';
      totalParams.push(period);
    }
    
    db.get(totalQuery, totalParams, (err, total) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({
        departmentId: parseInt(departmentId),
        period: period || '全部',
        employees,
        summary: {
          grandTotal: total.grand_total || 0,
          employeeCount: total.employee_count || 0,
          projectCount: total.project_count || 0
        }
      });
    });
  });
}

/**
 * 获取所有部门发放汇总
 * GET /api/payment/summary/all-departments
 */
router.get('/summary/all-departments', authenticate, requireAdminOrFinance, (req, res) => {
  const { period } = req.query;
  
  let query = `
    SELECT 
      d.id as department_id,
      d.name as department_name,
      d.code as department_code,
      SUM(pr.amount) as total_amount,
      COUNT(DISTINCT pr.user_id) as employee_count,
      COUNT(DISTINCT pr.project_id) as project_count
    FROM payment_records pr
    JOIN projects p ON pr.project_id = p.id
    JOIN users u ON pr.user_id = u.id
    JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (period) {
    query += ' AND p.period = ?';
    params.push(period);
  }
  
  query += ' GROUP BY d.id ORDER BY total_amount DESC';
  
  db.all(query, params, (err, departments) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    res.json({
      period: period || '全部',
      departments
    });
  });
});

/**
 * 删除发放记录
 * DELETE /api/payment/records/:recordId
 */
router.delete('/records/:recordId', authenticate, requireAdminOrFinance, (req, res) => {
  const { recordId } = req.params;
  
  db.run('DELETE FROM payment_records WHERE id = ?', [recordId], function(err) {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    res.json({ message: '发放记录删除成功' });
  });
});

module.exports = router;
