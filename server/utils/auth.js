const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7天过期

/**
 * 加密密码
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 验证密码
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * 生成JWT令牌
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    departmentId: user.department_id
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT令牌
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 检查权限
 * @param {Object} user - 用户对象
 * @param {string} resource - 资源类型
 * @param {string} action - 操作类型
 */
function checkPermission(user, resource, action) {
  const { role, departmentId } = user;
  
  // 管理员和财务有全部权限
  if (role === 'admin' || role === 'finance') {
    return true;
  }
  
  // 部门经理只能访问自己部门的数据
  if (role === 'manager') {
    if (resource === 'department' && action === 'read') {
      return true; // 可以读取自己部门的数据
    }
    if (resource === 'allocation' && (action === 'read' || action === 'write')) {
      return true; // 可以管理部门内分配
    }
  }
  
  // 普通员工只能查看自己的数据
  if (role === 'employee') {
    if (resource === 'self' && action === 'read') {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  checkPermission
};
