const { db } = require('./init');

/**
 * 更新部门为权威文档中的定义
 */
async function updateDepartments() {
  try {
    console.log('开始更新部门...');

    // 删除旧部门
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM departments', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✓ 已清除旧部门数据');

    // 创建新部门（基于韶谷数码城项目奖金发放计算表）
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
          function(err) {
            if (err) reject(err);
            else {
              console.log(`✓ 创建部门: ${dept.name} (${dept.code})`);
              resolve();
            }
          }
        );
      });
    }

    console.log('\n部门更新完成！');
    console.log('新部门列表:');
    console.log('1. 建筑部 (ARCH)');
    console.log('2. 结构部 (STRUCT)');
    console.log('3. 给排水部 (PLUMB)');
    console.log('4. 电气部 (ELEC)');
    console.log('5. 空调部 (HVAC)');
    
  } catch (error) {
    console.error('更新部门失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { initDatabase } = require('./init');
  
  initDatabase()
    .then(() => updateDepartments())
    .then(() => {
      console.log('\n数据库更新完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('错误:', err);
      process.exit(1);
    });
}

module.exports = { updateDepartments };
