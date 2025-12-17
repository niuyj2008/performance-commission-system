const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 查询用户
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        if (!user) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 验证密码
        const isValid = await verifyPassword(password, user.password_hash);
        
        if (!isValid) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成令牌
        const token = generateToken(user);
        
        // 返回用户信息和令牌
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            departmentId: user.department_id
          }
        });
      }
    );
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
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
 * 修改密码
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }
    
    // 查询当前用户
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id],
      async (err, user) => {
        if (err) {
          console.error('数据库错误:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        // 验证旧密码
        const isValid = await verifyPassword(oldPassword, user.password_hash);
        
        if (!isValid) {
          return res.status(401).json({ error: '旧密码错误' });
        }
        
        // 加密新密码
        const newHash = await hashPassword(newPassword);
        
        // 更新密码
        db.run(
          'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newHash, req.user.id],
          (err) => {
            if (err) {
              console.error('数据库错误:', err);
              return res.status(500).json({ error: '服务器错误' });
            }
            
            res.json({ message: '密码修改成功' });
          }
        );
      }
    );
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
