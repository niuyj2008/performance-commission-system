const { verifyToken, checkPermission } = require('../utils/auth');
const { db } = require('../db/init');

/**
 * 认证中间件 - 验证JWT令牌
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: '无效或过期的令牌' });
  }
  
  // 将用户信息附加到请求对象
  req.user = decoded;
  next();
}

/**
 * 权限检查中间件工厂函数
 * @param {string} resource - 资源类型
 * @param {string} action - 操作类型
 */
function authorize(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    
    const hasPermission = checkPermission(req.user, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    next();
  };
}

/**
 * 检查是否为管理员或财务
 */
function requireAdminOrFinance(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'finance') {
    return res.status(403).json({ error: '需要管理员或财务权限' });
  }
  
  next();
}

/**
 * 检查是否为部门经理
 */
function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }
  
  if (req.user.role !== 'manager' && req.user.role !== 'admin' && req.user.role !== 'finance') {
    return res.status(403).json({ error: '需要部门经理权限' });
  }
  
  next();
}

module.exports = {
  authenticate,
  authorize,
  requireAdminOrFinance,
  requireManager
};
