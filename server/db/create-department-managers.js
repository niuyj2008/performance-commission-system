const { db } = require('./init');
const { hashPassword } = require('../utils/auth');

/**
 * 为每个部门创建部门经理账号
 */
async function createDepartmentManagers() {
  try {
    console.log('开始创建部门经理账号...');

    // 获取所有部门
    const departments = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM departments ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`找到 ${departments.length} 个部门`);

    // 为每个部门创建经理账号
    const password = await hashPassword('manager123');
    
    for (const dept of departments) {
      const username = `manager_${dept.code.toLowerCase()}`;
      const name = `${dept.name}经理`;
      
      // 检查用户是否已存在
      const existingUser = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        console.log(`⊙ 用户已存在: ${username}`);
        continue;
      }

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (username, password_hash, name, role, department_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [username, password, name, 'manager', dept.id],
          function(err) {
            if (err) reject(err);
            else {
              console.log(`✓ 创建账号: ${username} (${name}) - 密码: manager123`);
              resolve();
            }
          }
        );
      });
    }

    console.log('\n部门经理账号创建完成！');
    console.log('\n登录信息:');
    console.log('1. manager_arch / manager123 - 建筑部经理');
    console.log('2. manager_struct / manager123 - 结构部经理');
    console.log('3. manager_plumb / manager123 - 给排水部经理');
    console.log('4. manager_elec / manager123 - 电气部经理');
    console.log('5. manager_hvac / manager123 - 空调部经理');
    
  } catch (error) {
    console.error('创建部门经理账号失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { initDatabase } = require('./init');
  
  initDatabase()
    .then(() => createDepartmentManagers())
    .then(() => {
      console.log('\n完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('错误:', err);
      process.exit(1);
    });
}

module.exports = { createDepartmentManagers };
