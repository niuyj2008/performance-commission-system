const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { hashPassword } = require('../utils/auth');
const { authenticate, requireAdminOrFinance } = require('../middleware/auth');

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
router.get('/me', authenticate, (req, res) => {
  db.get(
    'SELECT id, username, name, role, department_id, email, phone FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      res.json({ user });
    }
  );
});

/**
 * 获取部门列表
 * GET /api/users/departments
 */
router.get('/departments', authenticate, (req, res) => {
  db.all(
    'SELECT id, name, code, description FROM departments ORDER BY id',
    [],
    (err, departments) => {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ departments });
    }
  );
});

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', authenticate, (req, res) => {
  const { departmentId, role } = req.query;
  const currentUser = req.user;
  
  let query = `
    SELECT 
      u.id, 
      u.username, 
      u.name, 
      u.role, 
      u.department_id, 
      u.email, 
      u.phone, 
      u.created_at,
      d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  
  // 普通员工无权访问用户列表
  if (currentUser.role === 'employee') {
    return res.status(403).json({ error: '权限不足' });
  }
  
  // 管理员、财务、部门经理都可以查看所有员工（支持跨部门分配）
  
  // 管理员和财务可以按部门筛选
  if (departmentId && (currentUser.role === 'admin' || currentUser.role === 'finance')) {
    query += ' AND u.department_id = ?';
    params.push(departmentId);
  }
  
  if (role) {
    query += ' AND u.role = ?';
    params.push(role);
  }
  
  query += ' ORDER BY u.created_at DESC';
  
  db.all(query, params, (err, users) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    res.json({ users });
  });
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { username, password, name, role, department_id, email, phone } = req.body;
    const currentUser = req.user;
    
    // 权限检查
    if (currentUser.role === 'manager') {
      // 部门经理只能创建本部门的员工
      if (!currentUser.departmentId) {
        return res.status(403).json({ error: '您没有关联的部门' });
      }
      if (department_id != currentUser.departmentId) {
        return res.status(403).json({ error: '您只能添加本部门的员工' });
      }
      if (role !== 'employee') {
        return res.status(403).json({ error: '您只能添加普通员工' });
      }
    } else if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      return res.status(403).json({ error: '权限不足' });
    }
    
    // 验证必填字段
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: '用户名、密码、姓名和角色不能为空' });
    }
    
    // 验证角色
    const validRoles = ['admin', 'finance', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }
    
    // 加密密码
    const passwordHash = await hashPassword(password);
    
    // 插入用户
    db.run(
      `INSERT INTO users (username, password_hash, name, role, department_id, email, phone) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, passwordHash, name, role, department_id || null, email || null, phone || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: '用户名已存在' });
          }
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        res.status(201).json({
          message: '用户创建成功',
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, role, department_id, email, phone } = req.body;
  const currentUser = req.user;
  
  // 先查询要更新的用户信息
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, targetUser) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 权限检查
    if (currentUser.role === 'manager') {
      // 部门经理只能更新本部门的员工
      if (!currentUser.departmentId) {
        return res.status(403).json({ error: '您没有关联的部门' });
      }
      if (targetUser.department_id != currentUser.departmentId) {
        return res.status(403).json({ error: '您只能管理本部门的员工' });
      }
      // 部门经理不能修改角色和部门
      if (role && role !== targetUser.role) {
        return res.status(403).json({ error: '您无权修改员工角色' });
      }
      if (department_id !== undefined && department_id != currentUser.departmentId) {
        return res.status(403).json({ error: '您无权将员工转移到其他部门' });
      }
    } else if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (department_id !== undefined) {
      updates.push('department_id = ?');
      params.push(department_id || null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ message: '用户更新成功' });
    });
  });
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  
  // 先查询要删除的用户信息
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, targetUser) => {
    if (err) {
      console.error('数据库错误:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 权限检查
    if (currentUser.role === 'manager') {
      // 部门经理只能删除本部门的员工
      if (!currentUser.departmentId) {
        return res.status(403).json({ error: '您没有关联的部门' });
      }
      if (targetUser.department_id != currentUser.departmentId) {
        return res.status(403).json({ error: '您只能删除本部门的员工' });
      }
      if (targetUser.role !== 'employee') {
        return res.status(403).json({ error: '您只能删除普通员工' });
      }
    } else if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      return res.status(403).json({ error: '权限不足' });
    }
    
    // 执行删除
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      res.json({ message: '用户删除成功' });
    });
  });
});

module.exports = router;
