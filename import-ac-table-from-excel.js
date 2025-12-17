const { db, initDatabase } = require('./server/db/init');

/**
 * 从Excel导入空调面积表数据
 */
async function importAcTableFromExcel() {
  try {
    console.log('开始导入空调面积表数据...');

    // 1. 查找"韶谷数码城"项目
    let project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE name LIKE '%韶%' OR name LIKE '%华韶%' OR code = 'SGSMCC'", 
        [], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // 2. 如果项目不存在，报错
    if (!project) {
      throw new Error('未找到"韶谷数码城"项目，请先在系统中创建该项目');
    }
    
    console.log(`✓ 找到项目: ${project.name} (ID: ${project.id}, 代码: ${project.code})`);
    console.log(`  建筑面积: ${project.building_area}㎡`);
    console.log(`  设计阶段: ${project.stage}`);

    // 3. 删除该项目的旧空调面积表数据
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM air_conditioning_tables WHERE project_id = ?', [project.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✓ 已清除旧空调面积表数据');

    // 4. 导入新的空调面积表数据
    const acTables = [
      {
        ac_type: '全中央空调',
        location: '2#数据中心',
        area: 23215.0,
        notes: '含机械排烟、新风等有关暖通设计'
      },
      {
        ac_type: 'VRV空调（布管）',
        location: '1#产业用房1~2F',
        area: 1795.0,
        notes: ''
      },
      {
        ac_type: 'VRV空调（不布管）',
        location: '1#产业用房3~12F',
        area: 10277.0,
        notes: ''
      }
    ];

    for (const table of acTables) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO air_conditioning_tables (project_id, ac_type, location, area, notes) VALUES (?, ?, ?, ?, ?)',
          [project.id, table.ac_type, table.location, table.area, table.notes || null],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`✓ 导入: ${table.ac_type} - ${table.location} - ${table.area}㎡`);
              resolve();
            }
          }
        );
      });
    }

    console.log('\n空调面积表导入完成！');
    console.log(`项目: ${project.name}`);
    console.log(`项目ID: ${project.id}`);
    console.log(`导入记录数: ${acTables.length}`);
    console.log(`总空调面积: ${acTables.reduce((sum, t) => sum + t.area, 0)}㎡`);
    
  } catch (error) {
    console.error('导入失败:', error);
    throw error;
  }
}

// 运行导入
initDatabase()
  .then(() => importAcTableFromExcel())
  .then(() => {
    console.log('\n导入成功！');
    process.exit(0);
  })
  .catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
