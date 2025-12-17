/**
 * 导入2025年上半年项目提成分配数据
 * 数据来源: ALL奖金发放表2025年7月8日含预支（20250716).xlsx
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 部门ID映射 (配置文件ID -> 数据库ID)
const DEPT_MAP = {
  'arch': 5,      // 建筑部 (包含建筑一部、二部、三部)
  'structure': 6, // 结构部
  'water': 7,     // 给排水部
  'electric': 8,  // 电气部
  'hvac': 9       // 空调部
};

// 重点项目提成数据
const projectCommissions = [
  {
    code: '2025H1-SG-002',
    name: '南洋理工大学行政楼、图书馆',
    totalCommission: 153970.10,
    paymentStages: [
      {
        date: '202501',
        stage_name: '方案报建图',
        previous_ratio: 0.1,
        current_ratio: 0.4,
        total_ratio: 0.5,
        departments: {
          arch: 48362.79,      // 建筑三部
          structure: 46930.87,  // 结构部
          water: 15404.97,      // 给排水部
          electric: 18268.81,   // 电气部
          hvac: 14224.76        // 空调部
        }
      }
    ]
  },
  {
    code: '2025H1-SG-005',
    name: '西安广电项目',
    totalCommission: 87335.30,
    paymentStages: [
      {
        date: '202501',
        stage_name: '施工图',
        previous_ratio: 0,
        current_ratio: 0.6,
        total_ratio: 0.6,
        departments: {
          arch: 34073.79,      // 建筑一部
          structure: 27606.08,  // 结构部
          water: 9070.57,       // 给排水部
          electric: 10648.06    // 电气部
        }
      }
    ]
  },
  {
    code: '2025H1-SG-007',
    name: '韶关华韶数据谷二期',
    totalCommission: 30487.32,
    paymentStages: [
      {
        date: '202501',
        stage_name: '施工图',
        previous_ratio: 0.7,
        current_ratio: 0.1,
        total_ratio: 0.8,
        departments: {
          arch: 10592.45,      // 建筑一部
          structure: 8559.93,   // 结构部
          water: 2808.79,       // 给排水部
          electric: 3343.02,    // 电气部
          hvac: 3172.60         // 空调部
        }
      }
    ]
  },
  {
    code: '2025H1-SG-001',
    name: '花都国际绿色建材中心',
    totalCommission: 25692.92,
    paymentStages: [
      {
        date: '202501',
        stage_name: '施工图',
        previous_ratio: 0.8,
        current_ratio: 0.1,
        total_ratio: 0.9,
        departments: {
          arch: 7927.37,       // 建筑一部
          structure: 7688.42,   // 结构部
          water: 2522.98,       // 给排水部
          electric: 3000.87,    // 电气部
          hvac: 2754.77         // 空调部
        }
      }
    ]
  },
  {
    code: '2025H1-FA-001',
    name: '黄埔横沙丰乐广场美的总图方案',
    totalCommission: 500,
    paymentStages: [
      {
        date: '202501',
        stage_name: '方案',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 500  // 建筑部
        }
      }
    ]
  },
  {
    code: '2025H1-FA-004',
    name: '四点金私人住宅方案',
    totalCommission: 300,
    paymentStages: [
      {
        date: '202501',
        stage_name: '方案',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 300  // 建筑部
        }
      }
    ]
  },
  {
    code: '2025H1-FA-006',
    name: '电白马店河规划方案',
    totalCommission: 800,
    paymentStages: [
      {
        date: '202501',
        stage_name: '方案',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 800  // 建筑部
        }
      }
    ]
  },
  {
    code: '2025H1-FA-002',
    name: '意高项目3#公寓装修设计审图',
    totalCommission: 2300,
    paymentStages: [
      {
        date: '202501',
        stage_name: '方案',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 2300  // 建筑部
        }
      }
    ]
  },
  {
    code: '2025H1-SG-003',
    name: '建业大厦绿建设计',
    totalCommission: 3000,
    paymentStages: [
      {
        date: '202501',
        stage_name: '施工图',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 3000  // 建筑部
        }
      }
    ]
  },
  {
    code: '2025H1-SG-004',
    name: '建业大厦人防设计',
    totalCommission: 9000,
    paymentStages: [
      {
        date: '202501',
        stage_name: '施工图',
        previous_ratio: 0,
        current_ratio: 1.0,
        total_ratio: 1.0,
        departments: {
          arch: 9000  // 建筑部
        }
      }
    ]
  }
];

async function importCommissions() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let processedProjects = 0;
      let totalStages = 0;
      let totalDepartments = 0;
      const errors = [];

      console.log('开始导入2025年上半年项目提成分配数据...\n');

      projectCommissions.forEach((project, projectIndex) => {
        // 1. 查找项目ID
        db.get(
          'SELECT id FROM projects WHERE code = ?',
          [project.code],
          (err, projectRow) => {
            if (err) {
              errors.push(`查找项目失败 [${project.code}]: ${err.message}`);
              checkComplete();
              return;
            }

            if (!projectRow) {
              errors.push(`项目不存在 [${project.code}]`);
              checkComplete();
              return;
            }

            const projectId = projectRow.id;
            console.log(`\n处理项目: ${project.name} (${project.code})`);
            console.log(`  项目ID: ${projectId}`);
            console.log(`  总提成: ¥${project.totalCommission.toLocaleString()}`);

            // 2. 处理每个发放节点
            project.paymentStages.forEach((stage, stageIndex) => {
              // 检查发放节点是否已存在
              db.get(
                'SELECT id FROM payment_stages WHERE project_id = ? AND stage_date = ? AND stage_name = ?',
                [projectId, stage.date, stage.stage_name],
                (err, stageRow) => {
                  if (err) {
                    errors.push(`查找发放节点失败 [${project.code}]: ${err.message}`);
                    checkComplete();
                    return;
                  }

                  if (stageRow) {
                    console.log(`  ⊙ 发放节点已存在: ${stage.stage_name} (${stage.date})`);
                    processStage(projectId, stageRow.id, stage, project.code);
                  } else {
                    // 插入发放节点
                    db.run(
                      `INSERT INTO payment_stages 
                       (project_id, stage_date, stage_name, previous_ratio, current_ratio, total_ratio, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                      [projectId, stage.date, stage.stage_name, stage.previous_ratio, stage.current_ratio, stage.total_ratio],
                      function(err) {
                        if (err) {
                          errors.push(`插入发放节点失败 [${project.code}]: ${err.message}`);
                          checkComplete();
                          return;
                        }

                        const stageId = this.lastID;
                        console.log(`  ✓ 创建发放节点: ${stage.stage_name} (${stage.date}) - ID: ${stageId}`);
                        totalStages++;
                        processStage(projectId, stageId, stage, project.code);
                      }
                    );
                  }
                }
              );
            });

            processedProjects++;
          }
        );
      });

      function processStage(projectId, stageId, stage, projectCode) {
        // 3. 处理部门分配
        const deptEntries = Object.entries(stage.departments);
        let processedDepts = 0;

        deptEntries.forEach(([deptKey, amount]) => {
          const departmentId = DEPT_MAP[deptKey];
          
          if (!departmentId) {
            errors.push(`未知部门: ${deptKey}`);
            processedDepts++;
            checkComplete();
            return;
          }

          // 检查部门分配是否已存在
          db.get(
            'SELECT id FROM department_commissions WHERE project_id = ? AND department_id = ?',
            [projectId, departmentId],
            (err, deptRow) => {
              if (err) {
                errors.push(`查找部门分配失败 [${projectCode}]: ${err.message}`);
                processedDepts++;
                checkComplete();
                return;
              }

              if (deptRow) {
                // 更新部门分配金额
                db.run(
                  'UPDATE department_commissions SET amount = ? WHERE id = ?',
                  [amount, deptRow.id],
                  (err) => {
                    if (err) {
                      errors.push(`更新部门分配失败 [${projectCode}]: ${err.message}`);
                    } else {
                      console.log(`    ⟳ 更新部门分配: 部门${departmentId} - ¥${amount.toLocaleString()}`);
                      totalDepartments++;
                    }
                    processedDepts++;
                    checkComplete();
                  }
                );
              } else {
                // 插入部门分配 (ratio设为0,因为我们直接使用金额)
                db.run(
                  `INSERT INTO department_commissions 
                   (project_id, department_id, ratio, amount, created_at)
                   VALUES (?, ?, 0, ?, CURRENT_TIMESTAMP)`,
                  [projectId, departmentId, amount],
                  (err) => {
                    if (err) {
                      errors.push(`插入部门分配失败 [${projectCode}]: ${err.message}`);
                    } else {
                      console.log(`    ✓ 创建部门分配: 部门${departmentId} - ¥${amount.toLocaleString()}`);
                      totalDepartments++;
                    }
                    processedDepts++;
                    checkComplete();
                  }
                );
              }
            }
          );
        });
      }

      function checkComplete() {
        // 计算预期的总操作数
        const expectedOps = projectCommissions.reduce((sum, p) => {
          return sum + p.paymentStages.reduce((stageSum, s) => {
            return stageSum + Object.keys(s.departments).length;
          }, 0);
        }, 0);

        // 简单延迟检查，确保所有异步操作完成
        setTimeout(() => {
          if (processedProjects === projectCommissions.length) {
            console.log('\n' + '='.repeat(80));
            console.log('导入完成！');
            console.log(`处理项目: ${processedProjects} 个`);
            console.log(`创建发放节点: ${totalStages} 个`);
            console.log(`创建/更新部门分配: ${totalDepartments} 条`);
            
            if (errors.length > 0) {
              console.log(`\n错误 (${errors.length}):`);
              errors.forEach(err => console.log(`  ✗ ${err}`));
            }

            db.close((err) => {
              if (err) {
                console.error('关闭数据库失败:', err);
                reject(err);
              } else {
                resolve({ processedProjects, totalStages, totalDepartments, errors });
              }
            });
          }
        }, 2000);
      }
    });
  });
}

// 执行导入
importCommissions()
  .then(result => {
    console.log('\n项目提成数据导入脚本执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('导入过程出错:', err);
    process.exit(1);
  });
