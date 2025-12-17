/**
 * 花都国际绿色建材中心项目 - 完整数据导入
 * 
 * 根据现有数据整理的完整项目信息
 * 数据来源: ALL奖金发放表2025年7月8日含预支（20250716).xlsx
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 花都国际绿色建材中心完整数据
const huaduProject = {
  // 基本信息
  code: '2025H1-SG-001',
  name: '花都国际绿色建材中心',
  stage: 'construction',  // 施工图阶段
  period: '2025年上半年',
  
  // 项目属性（根据实际情况填写，目前设为默认值）
  building_area: 0,  // 建筑面积待补充
  building_type: 'commercial',  // 商业建筑（绿色建材中心）
  has_basement: 0,
  has_civil_defense: 0,
  is_green_building: 1,  // 是绿色建筑
  is_prefabricated: 0,
  is_reporting_project: 1,
  is_review_project: 1,
  
  // 提成信息
  totalCommission: 25692.92,
  
  // 发放节点
  paymentStages: [
    {
      date: '202501',
      stage_name: '施工图',
      previous_ratio: 0.8,  // 上期已发80%
      current_ratio: 0.1,   // 本期发放10%
      total_ratio: 0.9      // 总计已发90%
    }
  ],
  
  // 部门分配（本期实发金额）
  departments: {
    arch: {
      id: 5,
      name: '建筑部',
      amount: 7927.37,
      ratio: 0.309  // 30.9%
    },
    structure: {
      id: 6,
      name: '结构部',
      amount: 7688.42,
      ratio: 0.299  // 29.9%
    },
    water: {
      id: 7,
      name: '给排水部',
      amount: 2522.98,
      ratio: 0.098  // 9.8%
    },
    electric: {
      id: 8,
      name: '电气部',
      amount: 3000.87,
      ratio: 0.117  // 11.7%
    },
    hvac: {
      id: 9,
      name: '空调部',
      amount: 2754.77,
      ratio: 0.107  // 10.7%
    }
  },
  
  // 空调面积表（待补充，参考韶谷数码城项目格式）
  airConditioningTables: [
    // 示例数据，需要根据实际情况修改
    // {
    //   ac_type: 'full_central',
    //   area: 0,
    //   location: '待补充',
    //   notes: ''
    // }
  ]
};

async function importHuaduProject() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('========================================');
      console.log('花都国际绿色建材中心项目 - 完整数据导入');
      console.log('========================================\n');
      
      // 1. 检查项目是否存在
      db.get(
        'SELECT id FROM projects WHERE code = ?',
        [huaduProject.code],
        (err, row) => {
          if (err) {
            console.error('查询项目失败:', err);
            reject(err);
            return;
          }
          
          let projectId;
          
          if (row) {
            projectId = row.id;
            console.log(`[1/5] 项目已存在: ${huaduProject.name} (ID: ${projectId})`);
            console.log('      更新项目信息...');
            
            // 更新项目信息
            db.run(
              `UPDATE projects SET 
                name = ?,
                stage = ?,
                period = ?,
                building_area = ?,
                building_type = ?,
                has_basement = ?,
                has_civil_defense = ?,
                is_green_building = ?,
                is_prefabricated = ?,
                is_reporting_project = ?,
                is_review_project = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
              [
                huaduProject.name,
                huaduProject.stage,
                huaduProject.period,
                huaduProject.building_area,
                huaduProject.building_type,
                huaduProject.has_basement,
                huaduProject.has_civil_defense,
                huaduProject.is_green_building,
                huaduProject.is_prefabricated,
                huaduProject.is_reporting_project,
                huaduProject.is_review_project,
                projectId
              ],
              (err) => {
                if (err) {
                  console.error('      更新失败:', err);
                } else {
                  console.log('      ✓ 项目信息已更新');
                }
                processPaymentStages(projectId);
              }
            );
          } else {
            // 创建新项目
            console.log(`[1/5] 创建项目: ${huaduProject.name}`);
            
            db.run(
              `INSERT INTO projects (
                code, name, stage, period, building_area, building_type,
                has_basement, has_civil_defense, is_green_building, is_prefabricated,
                is_reporting_project, is_review_project, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                huaduProject.code,
                huaduProject.name,
                huaduProject.stage,
                huaduProject.period,
                huaduProject.building_area,
                huaduProject.building_type,
                huaduProject.has_basement,
                huaduProject.has_civil_defense,
                huaduProject.is_green_building,
                huaduProject.is_prefabricated,
                huaduProject.is_reporting_project,
                huaduProject.is_review_project
              ],
              function(err) {
                if (err) {
                  console.error('      创建失败:', err);
                  reject(err);
                  return;
                }
                
                projectId = this.lastID;
                console.log(`      ✓ 项目创建成功 (ID: ${projectId})`);
                processPaymentStages(projectId);
              }
            );
          }
          
          function processPaymentStages(projectId) {
            console.log('\n[2/5] 处理发放节点...');
            
            const stage = huaduProject.paymentStages[0];
            
            // 检查发放节点是否存在
            db.get(
              'SELECT id FROM payment_stages WHERE project_id = ? AND stage_date = ?',
              [projectId, stage.date],
              (err, stageRow) => {
                if (err) {
                  console.error('      查询失败:', err);
                  processDepartments(projectId, null);
                  return;
                }
                
                if (stageRow) {
                  console.log(`      ⊙ 发放节点已存在: ${stage.stage_name} (${stage.date})`);
                  processDepartments(projectId, stageRow.id);
                } else {
                  db.run(
                    `INSERT INTO payment_stages (
                      project_id, stage_date, stage_name, previous_ratio, current_ratio, total_ratio, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [projectId, stage.date, stage.stage_name, stage.previous_ratio, stage.current_ratio, stage.total_ratio],
                    function(err) {
                      if (err) {
                        console.error('      创建失败:', err);
                      } else {
                        console.log(`      ✓ 发放节点创建成功: ${stage.stage_name} (${stage.date})`);
                      }
                      processDepartments(projectId, this.lastID);
                    }
                  );
                }
              }
            );
          }
          
          function processDepartments(projectId, stageId) {
            console.log('\n[3/5] 处理部门分配...');
            
            const depts = Object.values(huaduProject.departments);
            let processed = 0;
            
            depts.forEach(dept => {
              db.get(
                'SELECT id FROM department_commissions WHERE project_id = ? AND department_id = ?',
                [projectId, dept.id],
                (err, deptRow) => {
                  if (err) {
                    console.error(`      查询失败 [${dept.name}]:`, err);
                    processed++;
                    checkComplete();
                    return;
                  }
                  
                  if (deptRow) {
                    // 更新部门分配
                    db.run(
                      'UPDATE department_commissions SET amount = ?, ratio = ? WHERE id = ?',
                      [dept.amount, dept.ratio, deptRow.id],
                      (err) => {
                        if (err) {
                          console.error(`      更新失败 [${dept.name}]:`, err);
                        } else {
                          console.log(`      ⟳ ${dept.name}: ¥${dept.amount.toLocaleString()} (${(dept.ratio * 100).toFixed(1)}%)`);
                        }
                        processed++;
                        checkComplete();
                      }
                    );
                  } else {
                    // 创建部门分配
                    db.run(
                      `INSERT INTO department_commissions (
                        project_id, department_id, ratio, amount, created_at
                      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                      [projectId, dept.id, dept.ratio, dept.amount],
                      (err) => {
                        if (err) {
                          console.error(`      创建失败 [${dept.name}]:`, err);
                        } else {
                          console.log(`      ✓ ${dept.name}: ¥${dept.amount.toLocaleString()} (${(dept.ratio * 100).toFixed(1)}%)`);
                        }
                        processed++;
                        checkComplete();
                      }
                    );
                  }
                }
              );
            });
            
            function checkComplete() {
              if (processed === depts.length) {
                processAirConditioningTables(projectId);
              }
            }
          }
          
          function processAirConditioningTables(projectId) {
            console.log('\n[4/5] 处理空调面积表...');
            
            if (huaduProject.airConditioningTables.length === 0) {
              console.log('      ⊙ 暂无空调面积表数据');
              showSummary(projectId);
              return;
            }
            
            // 先删除旧数据
            db.run(
              'DELETE FROM air_conditioning_tables WHERE project_id = ?',
              [projectId],
              (err) => {
                if (err) {
                  console.error('      删除旧数据失败:', err);
                  showSummary(projectId);
                  return;
                }
                
                let inserted = 0;
                huaduProject.airConditioningTables.forEach(ac => {
                  db.run(
                    `INSERT INTO air_conditioning_tables (
                      project_id, ac_type, area, location, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [projectId, ac.ac_type, ac.area, ac.location, ac.notes],
                    (err) => {
                      if (err) {
                        console.error('      插入失败:', err);
                      } else {
                        console.log(`      ✓ ${ac.ac_type}: ${ac.area} m² (${ac.location})`);
                      }
                      inserted++;
                      if (inserted === huaduProject.airConditioningTables.length) {
                        showSummary(projectId);
                      }
                    }
                  );
                });
              }
            );
          }
          
          function showSummary(projectId) {
            console.log('\n[5/5] 数据汇总...');
            
            // 查询汇总信息
            db.get(
              `SELECT 
                p.*,
                COUNT(DISTINCT ps.id) as stage_count,
                COUNT(DISTINCT dc.id) as dept_count,
                COUNT(DISTINCT act.id) as ac_count,
                SUM(dc.amount) as total_dept_amount
              FROM projects p
              LEFT JOIN payment_stages ps ON p.id = ps.project_id
              LEFT JOIN department_commissions dc ON p.id = dc.project_id
              LEFT JOIN air_conditioning_tables act ON p.id = act.project_id
              WHERE p.id = ?
              GROUP BY p.id`,
              [projectId],
              (err, summary) => {
                if (err) {
                  console.error('      查询失败:', err);
                  db.close();
                  reject(err);
                  return;
                }
                
                console.log('\n========================================');
                console.log('导入完成！');
                console.log('========================================');
                console.log(`项目编码: ${summary.code}`);
                console.log(`项目名称: ${summary.name}`);
                console.log(`设计阶段: ${summary.stage}`);
                console.log(`建筑面积: ${summary.building_area || 0} m² ${summary.building_area ? '' : '(待补充)'}`);
                console.log(`发放节点: ${summary.stage_count} 个`);
                console.log(`部门分配: ${summary.dept_count} 个部门`);
                console.log(`部门总额: ¥${(summary.total_dept_amount || 0).toLocaleString()}`);
                console.log(`空调面积表: ${summary.ac_count} 条记录`);
                console.log('\n提示:');
                console.log('  - 建筑面积需要补充');
                console.log('  - 空调面积表需要补充');
                console.log('  - 可以在系统中编辑项目补充这些信息');
                console.log('========================================\n');
                
                db.close((err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(summary);
                  }
                });
              }
            );
          }
        }
      );
    });
  });
}

// 执行导入
if (require.main === module) {
  importHuaduProject()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { importHuaduProject, huaduProject };
