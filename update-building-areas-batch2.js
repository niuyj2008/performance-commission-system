/**
 * 批量更新项目建筑面积 - 第二批
 * 数据来源: 韶谷数码城项目奖金发放计算表
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 第二批建筑面积数据
const buildingAreas = [
  {
    code: '2025H1-SG-007',
    name: '韶关华韶数据谷二期',
    building_area: 35287.0,
    source: '韶谷数码城项目奖金发放计算表(20200629).xls',
    notes: '办公楼,16层,单体,地下室面积比20%'
  }
];

async function updateBuildingAreas() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let updated = 0;
      let errors = 0;

      console.log('开始更新项目建筑面积(第二批)...\n');

      buildingAreas.forEach((project, index) => {
        // 先查询当前值
        db.get(
          'SELECT code, name, building_area FROM projects WHERE code = ?',
          [project.code],
          (err, row) => {
            if (err) {
              console.error(`✗ 查询失败 [${project.code}]: ${err.message}`);
              errors++;
              checkComplete();
              return;
            }

            if (!row) {
              console.error(`✗ 项目不存在 [${project.code}]`);
              errors++;
              checkComplete();
              return;
            }

            console.log(`\n项目: ${project.name} (${project.code})`);
            console.log(`  当前建筑面积: ${row.building_area} m²`);
            console.log(`  新建筑面积: ${project.building_area} m²`);
            console.log(`  数据来源: ${project.source}`);
            if (project.notes) {
              console.log(`  备注: ${project.notes}`);
            }

            // 更新建筑面积
            db.run(
              'UPDATE projects SET building_area = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?',
              [project.building_area, project.code],
              (err) => {
                if (err) {
                  console.error(`  ✗ 更新失败: ${err.message}`);
                  errors++;
                } else {
                  console.log(`  ✓ 更新成功`);
                  updated++;
                }
                checkComplete();
              }
            );
          }
        );
      });

      function checkComplete() {
        if (updated + errors === buildingAreas.length) {
          setTimeout(() => {
            console.log('\n' + '='.repeat(80));
            console.log('更新完成！');
            console.log(`总计: ${buildingAreas.length} 个项目`);
            console.log(`成功: ${updated} 个`);
            console.log(`失败: ${errors} 个`);

            // 验证更新结果
            console.log('\n验证更新结果:');
            const codes = buildingAreas.map(p => `'${p.code}'`).join(',');
            db.all(
              `SELECT code, name, building_area FROM projects WHERE code IN (${codes})`,
              (err, rows) => {
                if (err) {
                  console.error('验证失败:', err);
                } else {
                  rows.forEach(row => {
                    console.log(`  ${row.code}: ${row.building_area} m²`);
                  });
                }

                db.close((err) => {
                  if (err) {
                    console.error('关闭数据库失败:', err);
                    reject(err);
                  } else {
                    resolve({ updated, errors });
                  }
                });
              }
            );
          }, 500);
        }
      }
    });
  });
}

// 执行更新
updateBuildingAreas()
  .then(result => {
    console.log('\n建筑面积更新脚本执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('更新过程出错:', err);
    process.exit(1);
  });
