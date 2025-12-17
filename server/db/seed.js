const { db } = require('./init');
const { hashPassword } = require('../utils/auth');

/**
 * 创建初始数据
 */
async function seedDatabase() {
  try {
    // 检查是否已有用户
    const userCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (userCount > 0) {
      console.log('数据库已有数据，跳过初始化');
      return;
    }

    console.log('开始初始化数据...');

    // 创建部门（基于韶谷数码城项目奖金发放计算表）
    const departments = [
      { name: '建筑部', code: 'ARCH' },
      { name: '结构部', code: 'STRUCT' },
      { name: '给排水部', code: 'PLUMB' },
      { name: '电气部', code: 'ELEC' },
      { name: '空调部', code: 'HVAC' }
    ];

    for (const dept of departments) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO departments (name, code) VALUES (?, ?)',
          [dept.name, dept.code],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('✓ 部门创建完成');

    // 创建默认管理员账户
    const adminPassword = await hashPassword('admin123');
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password_hash, name, role) 
         VALUES (?, ?, ?, ?)`,
        ['admin', adminPassword, '系统管理员', 'admin'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✓ 管理员账户创建完成');
    console.log('  用户名: admin');
    console.log('  密码: admin123');

    // 创建财务账户
    const financePassword = await hashPassword('finance123');
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password_hash, name, role) 
         VALUES (?, ?, ?, ?)`,
        ['finance', financePassword, '财务人员', 'finance'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✓ 财务账户创建完成');
    console.log('  用户名: finance');
    console.log('  密码: finance123');

    console.log('\n初始化完成！');
  } catch (error) {
    console.error('初始化数据失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { initDatabase } = require('./init');
  
  initDatabase()
    .then(() => seedDatabase())
    .then(() => {
      console.log('数据库初始化和数据填充完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('错误:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
