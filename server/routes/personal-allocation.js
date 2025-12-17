const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate } = require('../middleware/auth');

/**
 * 获取项目的个人分配
 * GET /api/personal-allocation/:projectId
 */
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const currentUser = req.user;
    
    // 构建查询条件
    let query = `
      SELECT 
        ed.id,
        ed.project_id,
        ed.department_id,
        ed.employee_id,
        ed.amount,
        ed.notes,
        ed.created_at,
        ed.updated_at,
        u.name as employee_name,
        u.username as employee_username,
        d.name as department_name
      FROM employee_distributions ed
      JOIN users u ON ed.employee_id = u.id
      JOIN departments d ON ed.department_id = d.id
      WHERE ed.project_id = ?
    `;
    
    const params = [projectId];
    
    // 如果是部门经理，只返回本部门的数据
    if (currentUser.role === 'manager' && currentUser.department_id) {
      query += ' AND ed.department_id = ?';
      params.push(currentUser.department_id);
    }
    
    query += ' ORDER BY d.name, u.name';
    
    const allocations = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // 获取部门分配总额
    // 注意：department_allocations表中的department_id是配置文件中的ID（如'arch', 'structure'）
    // 需要映射到departments表的code字段
    const deptIdToCode = {
      'arch': 'ARCH',
      'structure': 'STRUCT',
      'water': 'PLUMB',
      'electric': 'ELEC',
      'hvac': 'HVAC',
      'chief': 'CHIEF'
    };
    
    const deptAllocQuery = `
      SELECT 
        da.department_id,
        da.allocated_amount
      FROM department_allocations da
      WHERE da.project_id = ?
    `;
    
    const deptParams = [projectId];
    
    const deptAllocations = await new Promise((resolve, reject) => {
      db.all(deptAllocQuery, deptParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // 获取部门信息
    const deptQuery = 'SELECT id, name, code FROM departments';
    const departments = await new Promise((resolve, reject) => {
      db.all(deptQuery, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // 建立code到部门信息的映射
    const codeToDept = {};
    departments.forEach(dept => {
      codeToDept[dept.code] = dept;
    });
    
    // 为每个部门分配添加部门名称
    deptAllocations.forEach(alloc => {
      const code = deptIdToCode[alloc.department_id];
      if (code && codeToDept[code]) {
        alloc.department_name = codeToDept[code].name;
        alloc.db_department_id = codeToDept[code].id; // 数据库中的部门ID
      }
    });
    
    // 计算汇总信息
    // 使用数据库中的部门ID作为key，因为前端和allocations都使用数据库ID
    const summary = {};
    deptAllocations.forEach(dept => {
      if (!dept.db_department_id) {
        return; // 跳过没有映射的部门
      }
      
      const dbDeptId = dept.db_department_id; // 数据库中的部门ID
      const allocated = allocations
        .filter(a => a.department_id == dbDeptId)
        .reduce((sum, a) => sum + a.amount, 0);
      
      summary[dbDeptId] = {
        department_name: dept.department_name,
        total: dept.allocated_amount,
        allocated: Math.round(allocated * 100) / 100,
        remaining: Math.round((dept.allocated_amount - allocated) * 100) / 100
      };
    });
    
    res.json({
      allocations,
      summary
    });
    
  } catch (error) {
    console.error('获取个人分配失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 创建或更新个人分配
 * POST /api/personal-allocation/:projectId
 */
router.post('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { allocations } = req.body;
    const currentUser = req.user;
    
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ error: '请提供分配数据' });
    }
    
    // 验证权限和数据
    for (const alloc of allocations) {
      // 验证金额
      if (!alloc.amount || alloc.amount <= 0) {
        return res.status(400).json({ error: '分配金额必须大于0' });
      }
      
      // 获取员工信息
      const employee = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [alloc.employee_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!employee) {
        return res.status(404).json({ error: `员工ID ${alloc.employee_id} 不存在` });
      }
      
      // 所有角色（管理员、财务、部门经理）都可以跨部门分配
      // 不再限制部门经理只能分配本部门员工
    }
    
    // 验证部门分配总额
    // 按部门分组验证（管理员和财务可能跨部门分配）
    const allocationsByDept = {};
    for (const alloc of allocations) {
      const employee = await new Promise((resolve, reject) => {
        db.get('SELECT department_id FROM users WHERE id = ?', [alloc.employee_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (employee && employee.department_id) {
        if (!allocationsByDept[employee.department_id]) {
          allocationsByDept[employee.department_id] = [];
        }
        allocationsByDept[employee.department_id].push(alloc);
      }
    }
    
    // 验证每个部门的分配总额
    for (const [deptId, deptAllocations] of Object.entries(allocationsByDept)) {
      // 部门ID映射（数据库ID到配置文件ID）
      const deptIdMap = {
        '5': 'arch',
        '6': 'structure',
        '7': 'water',
        '8': 'electric',
        '9': 'hvac'
      };
      
      const configDeptId = deptIdMap[deptId];
      if (!configDeptId) continue;
      
      // 获取部门总额
      const deptAlloc = await new Promise((resolve, reject) => {
        db.get(
          'SELECT allocated_amount FROM department_allocations WHERE project_id = ? AND department_id = ?',
          [projectId, configDeptId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!deptAlloc) {
        continue; // 如果部门没有分配，跳过验证
      }
      
      // 计算本次分配的总额
      const newTotal = deptAllocations.reduce((sum, a) => sum + a.amount, 0);
      
      // 获取该部门其他员工的已分配额（不包括本次要更新的员工）
      const employeeIds = deptAllocations.map(a => a.employee_id);
      const existingQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM employee_distributions
        WHERE project_id = ? AND department_id = ? AND employee_id NOT IN (${employeeIds.map(() => '?').join(',')})
      `;
      
      const existingTotal = await new Promise((resolve, reject) => {
        db.get(existingQuery, [projectId, deptId, ...employeeIds], (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.total : 0);
        });
      });
      
      const totalAllocation = newTotal + existingTotal;
      
      if (totalAllocation > deptAlloc.allocated_amount) {
        const excess = totalAllocation - deptAlloc.allocated_amount;
        return res.status(400).json({ 
          error: `分配总额超出部门限额，超出金额：¥${excess.toFixed(2)}` 
        });
      }
    }
    
    // 如果有发放节点，验证当期限额
    const paymentStageId = allocations[0]?.payment_stage_id;
    if (paymentStageId) {
      // 获取发放节点信息
      const stage = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM payment_stages WHERE id = ?', [paymentStageId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (stage) {
        // 验证每个部门的当期限额
        for (const [deptId, deptAllocations] of Object.entries(allocationsByDept)) {
          const deptIdMap = {
            '5': 'arch',
            '6': 'structure',
            '7': 'water',
            '8': 'electric',
            '9': 'hvac'
          };
          
          const configDeptId = deptIdMap[deptId];
          if (!configDeptId) continue;
          
          // 获取部门总额
          const deptAlloc = await new Promise((resolve, reject) => {
            db.get(
              'SELECT allocated_amount FROM department_allocations WHERE project_id = ? AND department_id = ?',
              [projectId, configDeptId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
          
          if (!deptAlloc) continue;
          
          // 计算当期限额
          const currentLimit = deptAlloc.allocated_amount * stage.current_ratio;
          
          // 计算本次分配的总额
          const newTotal = deptAllocations.reduce((sum, a) => sum + a.amount, 0);
          
          if (newTotal > currentLimit) {
            const excess = newTotal - currentLimit;
            return res.status(400).json({ 
              error: `分配总额 ¥${newTotal.toFixed(2)} 超过当期可分配金额 ¥${currentLimit.toFixed(2)}，超出 ¥${excess.toFixed(2)}` 
            });
          }
        }
      }
    }
    
    // 保存分配
    for (const alloc of allocations) {
      const employee = await new Promise((resolve, reject) => {
        db.get('SELECT department_id FROM users WHERE id = ?', [alloc.employee_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO employee_distributions 
           (project_id, department_id, employee_id, amount, notes, payment_stage_id, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [projectId, employee.department_id, alloc.employee_id, alloc.amount, alloc.notes || null, alloc.payment_stage_id || null],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    
    res.json({ 
      message: '个人分配保存成功',
      count: allocations.length
    });
    
  } catch (error) {
    console.error('保存个人分配失败:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

/**
 * 删除个人分配
 * DELETE /api/personal-allocation/:projectId/:employeeId
 */
router.delete('/:projectId/:employeeId', authenticate, async (req, res) => {
  try {
    const { projectId, employeeId } = req.params;
    const currentUser = req.user;
    
    // 获取要删除的分配记录
    const allocation = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM employee_distributions WHERE project_id = ? AND employee_id = ?',
        [projectId, employeeId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!allocation) {
      return res.status(404).json({ error: '分配记录不存在' });
    }
    
    // 如果是部门经理，验证是否是本部门的记录
    if (currentUser.role === 'manager') {
      if (allocation.department_id != currentUser.department_id) {
        return res.status(403).json({ error: '您没有权限删除其他部门的分配' });
      }
    }
    
    // 删除记录
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM employee_distributions WHERE project_id = ? AND employee_id = ?',
        [projectId, employeeId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ message: '个人分配删除成功' });
    
  } catch (error) {
    console.error('删除个人分配失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
