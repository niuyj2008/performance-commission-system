const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');

/**
 * 获取项目列表
 * GET /api/projects
 * 
 * 权限说明：
 * - admin/finance: 看到所有项目，显示项目总提成
 * - manager: 只看到本部门有分配的项目，显示部门分配金额
 * - employee: 看到所有项目（只读）
 */
router.get('/', authenticate, (req, res) => {
  const { period, status, stage } = req.query;
  const user = req.user;
  
  // 如果是部门经理，需要特殊处理
  if (user.role === 'manager' && user.departmentId) {
    // 获取部门代码
    db.get(
      'SELECT code FROM departments WHERE id = ?',
      [user.departmentId],
      (err, department) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        if (!department) {
          return res.status(400).json({ error: '未找到部门信息' });
        }
        
        // 查询该部门有分配的项目（使用 LOWER 处理大小写不匹配）
        let query = `
          SELECT DISTINCT 
            p.*,
            da.allocated_amount as department_allocated_amount,
            da.allocation_weight as department_weight
          FROM projects p
          INNER JOIN department_allocations da ON p.id = da.project_id
          WHERE LOWER(da.department_id) = LOWER(?)
        `;
        const params = [department.code];
        
        console.log(`[Manager View] 部门经理查询项目 - 部门代码: ${department.code}, 用户: ${user.username}`);
        
        if (period) {
          query += ' AND p.period = ?';
          params.push(period);
        }
        
        if (status) {
          query += ' AND p.status = ?';
          params.push(status);
        }
        
        if (stage) {
          query += ' AND p.stage = ?';
          params.push(stage);
        }
        
        query += ' ORDER BY p.created_at DESC';
        
        console.log(`[Manager View] SQL: ${query}`);
        console.log(`[Manager View] Params:`, params);
        
        db.all(query, params, (err, projects) => {
          if (err) {
            console.error('[Manager View] 数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          console.log(`[Manager View] 查询到 ${projects.length} 个项目`);
          
          // 对于部门经理，将 calculated_commission 替换为部门分配金额
          const managerProjects = projects.map(p => ({
            ...p,
            calculated_commission: p.department_allocated_amount,
            is_manager_view: true,
            department_code: department.code
          }));
          
          res.json({ projects: managerProjects });
        });
      }
    );
  } else {
    // admin/finance/employee 看到所有项目
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    
    if (period) {
      query += ' AND period = ?';
      params.push(period);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, projects) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ projects });
    });
  }
});

/**
 * 获取单个项目详情
 * GET /api/projects/:id
 * 
 * 权限说明：
 * - admin/finance: 看到项目总提成
 * - manager: 看到部门分配金额
 * - employee: 看到项目总提成（只读）
 */
router.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const user = req.user;
  
  db.get('SELECT * FROM projects WHERE id = ?', [id], (err, project) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 如果是部门经理，替换为部门分配金额
    if (user.role === 'manager' && user.departmentId) {
      db.get(
        'SELECT code FROM departments WHERE id = ?',
        [user.departmentId],
        (err, department) => {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          if (!department) {
            return res.json({ project });
          }
          
          // 获取部门分配金额（使用 LOWER 处理大小写不匹配）
          db.get(
            'SELECT allocated_amount, allocation_weight FROM department_allocations WHERE project_id = ? AND LOWER(department_id) = LOWER(?)',
            [id, department.code],
            (err, allocation) => {
              if (err) {
                console.error('数据库错误:', err);
                return res.status(500).json({ error: '服务器错误' });
              }
              
              if (allocation) {
                project.calculated_commission = allocation.allocated_amount;
                project.department_allocated_amount = allocation.allocated_amount;
                project.department_weight = allocation.allocation_weight;
                project.is_manager_view = true;
                project.department_code = department.code;
              }
              
              res.json({ project });
            }
          );
        }
      );
    } else {
      res.json({ project });
    }
  });
});

/**
 * 创建项目
 * POST /api/projects
 */
router.post('/', authenticate, requireAdminOrFinance, (req, res) => {
  const {
    code,
    name,
    stage,
    building_area,
    building_type,
    period,
    has_basement,
    has_civil_defense,
    is_green_building,
    is_prefabricated,
    is_reporting_project,
    is_review_project
  } = req.body;
  
  // 验证必填字段
  if (!code || !name) {
    return res.status(400).json({ error: '项目编号和名称不能为空' });
  }
  
  // 验证阶段
  const validStages = ['scheme', 'construction', 'cooperation'];
  if (stage && !validStages.includes(stage)) {
    return res.status(400).json({ error: '无效的设计阶段' });
  }
  
  // 验证建筑类型
  const validTypes = ['office', 'residential', 'school', 'commercial', 'industrial', 'other'];
  if (building_type && !validTypes.includes(building_type)) {
    return res.status(400).json({ error: '无效的建筑类型' });
  }
  
  db.run(
    `INSERT INTO projects (
      code, name, stage, building_area, building_type, period,
      has_basement, has_civil_defense, is_green_building, 
      is_prefabricated, is_reporting_project, is_review_project
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code, name, stage || null, building_area || null, building_type || null, period || null,
      has_basement ? 1 : 0, has_civil_defense ? 1 : 0, is_green_building ? 1 : 0,
      is_prefabricated ? 1 : 0, is_reporting_project ? 1 : 0, is_review_project ? 1 : 0
    ],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: '项目编号已存在' });
        }
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.status(201).json({
        message: '项目创建成功',
        projectId: this.lastID
      });
    }
  );
});

/**
 * 更新项目
 * PUT /api/projects/:id
 */
router.put('/:id', authenticate, requireAdminOrFinance, (req, res) => {
  const { id } = req.params;
  const {
    name,
    stage,
    building_area,
    building_type,
    calculated_commission,
    status,
    period,
    has_basement,
    has_civil_defense,
    is_green_building,
    is_prefabricated,
    is_reporting_project,
    is_review_project
  } = req.body;
  
  const updates = [];
  const params = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (stage) {
    updates.push('stage = ?');
    params.push(stage);
  }
  if (building_area !== undefined) {
    updates.push('building_area = ?');
    params.push(building_area);
  }
  if (building_type !== undefined) {
    updates.push('building_type = ?');
    params.push(building_type);
  }
  if (calculated_commission !== undefined) {
    updates.push('calculated_commission = ?');
    params.push(calculated_commission);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (period !== undefined) {
    updates.push('period = ?');
    params.push(period);
  }
  if (has_basement !== undefined) {
    updates.push('has_basement = ?');
    params.push(has_basement ? 1 : 0);
  }
  if (has_civil_defense !== undefined) {
    updates.push('has_civil_defense = ?');
    params.push(has_civil_defense ? 1 : 0);
  }
  if (is_green_building !== undefined) {
    updates.push('is_green_building = ?');
    params.push(is_green_building ? 1 : 0);
  }
  if (is_prefabricated !== undefined) {
    updates.push('is_prefabricated = ?');
    params.push(is_prefabricated ? 1 : 0);
  }
  if (is_reporting_project !== undefined) {
    updates.push('is_reporting_project = ?');
    params.push(is_reporting_project ? 1 : 0);
  }
  if (is_review_project !== undefined) {
    updates.push('is_review_project = ?');
    params.push(is_review_project ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  
  const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    res.json({ message: '项目更新成功' });
  });
});

/**
 * 删除项目
 * DELETE /api/projects/:id
 */
router.delete('/:id', authenticate, requireAdminOrFinance, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    res.json({ message: '项目删除成功' });
  });
});

/**
 * 添加项目追加
 * POST /api/projects/:id/additions
 */
router.post('/:id/additions', authenticate, requireAdminOrFinance, (req, res) => {
  const { id } = req.params;
  const {
    building_area_change,
    new_total_commission,
    incremental_commission,
    notes
  } = req.body;
  
  if (!new_total_commission || !incremental_commission) {
    return res.status(400).json({ error: '新总额和增量提成不能为空' });
  }
  
  // 先获取当前追加次数
  db.get(
    'SELECT COUNT(*) as count FROM project_additions WHERE project_id = ?',
    [id],
    (err, result) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      const additionNumber = result.count + 1;
      
      // 插入追加记录
      db.run(
        `INSERT INTO project_additions 
         (project_id, addition_number, building_area_change, new_total_commission, 
          incremental_commission, notes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, additionNumber, building_area_change || null, new_total_commission, 
         incremental_commission, notes || null],
        function(err) {
          if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          // 更新项目的追加标记
          db.run(
            'UPDATE projects SET has_addition = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id],
            (err) => {
              if (err) {
                console.error('数据库错误:', err);
              }
            }
          );
          
          res.status(201).json({
            message: '项目追加记录成功',
            additionId: this.lastID,
            additionNumber
          });
        }
      );
    }
  );
});

/**
 * 获取项目追加历史
 * GET /api/projects/:id/additions
 */
router.get('/:id/additions', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.all(
    'SELECT * FROM project_additions WHERE project_id = ? ORDER BY addition_number',
    [id],
    (err, additions) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ additions });
    }
  );
});

module.exports = router;
