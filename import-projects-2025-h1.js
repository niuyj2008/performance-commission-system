/**
 * 导入2025年上半年项目清单
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 2025年上半年项目清单
const projects = [
  // 施工图阶段
  {
    code: '2025H1-SG-001',
    name: '花都国际绿色建材中心',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SG-002',
    name: '南洋理工大学行政楼、图书馆',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SG-003',
    name: '建业大厦绿建设计',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SG-004',
    name: '建业大厦人防设计',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SG-005',
    name: '西安广电项目',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SG-007',
    name: '韶关华韶数据谷二期',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  
  // 方案阶段
  {
    code: '2025H1-FA-001',
    name: '黄埔横沙丰乐广场美的总图方案',
    stage: 'scheme',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-FA-002',
    name: '意高项目3#公寓装修设计审图',
    stage: 'scheme',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-FA-004',
    name: '四点金私人住宅方案',
    stage: 'scheme',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-FA-006',
    name: '电白马店河规划方案',
    stage: 'scheme',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  
  // 施工配合阶段
  {
    code: '2025H1-SC-001',
    name: '花都国际绿色建材中心（施工配合）',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SC-002',
    name: '武汉广电项目（施工配合）',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  },
  {
    code: '2025H1-SC-003',
    name: '粤电广场停车架（施工配合）',
    stage: 'construction',
    building_area: 0,
    period: '2025上半年',
    status: 'active'
  }
];

async function importProjects() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      console.log('开始导入2025年上半年项目清单...\n');

      projects.forEach((project, index) => {
        // 检查项目是否已存在
        db.get(
          'SELECT id FROM projects WHERE code = ?',
          [project.code],
          (err, row) => {
            if (err) {
              console.error(`✗ 检查项目失败 [${project.code}]: ${err.message}`);
              errors++;
              return;
            }

            if (row) {
              console.log(`⊙ 项目已存在，跳过: ${project.name} (${project.code})`);
              skipped++;
            } else {
              // 插入新项目
              db.run(
                `INSERT INTO projects 
                 (code, name, stage, building_area, period, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [
                  project.code,
                  project.name,
                  project.stage,
                  project.building_area,
                  project.period,
                  project.status
                ],
                (err) => {
                  if (err) {
                    console.error(`✗ 导入失败 [${project.code}]: ${err.message}`);
                    errors++;
                  } else {
                    console.log(`✓ 导入成功: ${project.name} (${project.code})`);
                    imported++;
                  }

                  // 最后一个项目处理完成后输出统计
                  if (index === projects.length - 1) {
                    setTimeout(() => {
                      console.log('\n导入完成！');
                      console.log(`总计: ${projects.length} 个项目`);
                      console.log(`成功: ${imported} 个`);
                      console.log(`跳过: ${skipped} 个`);
                      console.log(`失败: ${errors} 个`);
                      
                      db.close((err) => {
                        if (err) {
                          console.error('关闭数据库失败:', err);
                          reject(err);
                        } else {
                          resolve({ imported, skipped, errors });
                        }
                      });
                    }, 500);
                  }
                }
              );
            }
          }
        );
      });
    });
  });
}

// 执行导入
importProjects()
  .then(result => {
    console.log('\n项目导入脚本执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('导入过程出错:', err);
    process.exit(1);
  });
