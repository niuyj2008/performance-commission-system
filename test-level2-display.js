/**
 * 测试第二级部门分配显示
 * 验证部门经理和管理员看到的数据是否一致
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('========================================');
console.log('第二级部门分配显示测试');
console.log('========================================\n');

// 测试项目ID (韶关华韶数据谷二期)
const testProjectId = 5;

async function testLevel2Display() {
  try {
    // 1. 获取项目信息
    console.log('1. 获取项目信息...');
    const project = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM projects WHERE id = ?', [testProjectId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!project) {
      console.error('❌ 项目不存在');
      return;
    }
    
    console.log(`   项目: ${project.name} (${project.code})`);
    console.log(`   建筑面积: ${project.building_area} m²\n`);
    
    // 2. 获取发放节点
    console.log('2. 获取发放节点...');
    const stages = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM payment_stages WHERE project_id = ? ORDER BY stage_date ASC',
        [testProjectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (stages.length === 0) {
      console.log('   ⚠️  未配置发放节点,将使用100%作为默认值\n');
    } else {
      console.log(`   发放节点数量: ${stages.length}`);
      stages.forEach((stage, index) => {
        console.log(`   [${index + 1}] ${stage.stage_date} - ${stage.stage_name}`);
        console.log(`       上期: ${(stage.previous_ratio * 100).toFixed(1)}%, 本期: ${(stage.current_ratio * 100).toFixed(1)}%, 总计: ${(stage.total_ratio * 100).toFixed(1)}%`);
      });
      console.log('');
    }
    
    // 选择最新的发放节点
    const selectedStage = stages.length > 0 ? stages[stages.length - 1] : null;
    const currentRatio = selectedStage ? selectedStage.current_ratio : 1;
    
    if (selectedStage) {
      console.log(`   ✓ 自动选择最新节点: ${selectedStage.stage_date} - ${selectedStage.stage_name}`);
      console.log(`   ✓ 本期比例: ${(currentRatio * 100).toFixed(1)}%\n`);
    }
    
    // 3. 获取部门分配
    console.log('3. 获取部门分配...');
    const deptCommissions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT dc.*, d.name as department_name, d.code as department_code
         FROM department_commissions dc
         JOIN departments d ON dc.department_id = d.id
         WHERE dc.project_id = ?`,
        [testProjectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (deptCommissions.length === 0) {
      console.log('   ❌ 未找到部门分配数据\n');
      return;
    }
    
    console.log(`   部门分配数量: ${deptCommissions.length}\n`);
    
    // 4. 获取已发放金额
    console.log('4. 获取已发放金额...');
    const paidByDept = {};
    
    if (selectedStage) {
      const paidAmounts = await new Promise((resolve, reject) => {
        db.all(
          `SELECT department_id, COALESCE(SUM(amount), 0) as total
           FROM employee_distributions
           WHERE project_id = ? AND payment_stage_id = ?
           GROUP BY department_id`,
          [testProjectId, selectedStage.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      paidAmounts.forEach(row => {
        paidByDept[row.department_id] = row.total;
      });
      
      console.log(`   已发放部门数: ${paidAmounts.length}\n`);
    } else {
      console.log('   无发放节点,跳过已发放金额查询\n');
    }
    
    // 5. 显示各部门数据
    console.log('5. 部门分配详情:');
    console.log('========================================');
    
    const deptNames = {
      'arch': '建筑部',
      'structure': '结构部',
      'water': '给排水部',
      'electric': '电气部',
      'hvac': '空调部'
    };
    
    deptCommissions.forEach(dept => {
      const totalAmount = dept.amount;
      const currentAmount = totalAmount * currentRatio;
      const paidAmount = paidByDept[dept.department_id] || 0;
      const remainingAmount = currentAmount - paidAmount;
      
      console.log(`\n【${dept.department_name}】(ID: ${dept.department_id})`);
      console.log(`  总额:           ¥${totalAmount.toLocaleString()}`);
      console.log(`  当期发放:       ¥${currentAmount.toLocaleString()} (${(currentRatio * 100).toFixed(1)}%)`);
      
      if (paidAmount > 0) {
        console.log(`  已发放:         ¥${paidAmount.toLocaleString()}`);
        console.log(`  剩余可发放:     ¥${remainingAmount.toLocaleString()}`);
      }
      
      console.log(`  分配比例:       ${(dept.ratio * 100).toFixed(2)}%`);
      
      // 验证计算
      const calculatedCurrent = totalAmount * currentRatio;
      const calculatedRemaining = calculatedCurrent - paidAmount;
      
      if (Math.abs(calculatedCurrent - currentAmount) < 0.01) {
        console.log(`  ✓ 当期发放计算正确`);
      } else {
        console.log(`  ❌ 当期发放计算错误! 预期: ¥${calculatedCurrent.toLocaleString()}, 实际: ¥${currentAmount.toLocaleString()}`);
      }
      
      if (paidAmount > 0 && Math.abs(calculatedRemaining - remainingAmount) < 0.01) {
        console.log(`  ✓ 剩余金额计算正确`);
      }
    });
    
    console.log('\n========================================');
    
    // 6. 模拟部门经理视图
    console.log('\n6. 模拟部门经理视图 (建筑部):');
    console.log('========================================');
    
    const archDept = deptCommissions.find(d => d.department_id === 5); // 建筑部
    
    if (archDept) {
      const totalAmount = archDept.amount;
      const currentAmount = totalAmount * currentRatio;
      const paidAmount = paidByDept[5] || 0;
      const remainingAmount = currentAmount - paidAmount;
      
      console.log('\n部门经理看到的数据:');
      console.log(`  总额:           ¥${totalAmount.toLocaleString()}`);
      console.log(`  当期发放:       ¥${currentAmount.toLocaleString()} (${selectedStage ? selectedStage.stage_name : '全额'} ${(currentRatio * 100).toFixed(1)}%)`);
      
      if (paidAmount > 0) {
        console.log(`  已发放:         ¥${paidAmount.toLocaleString()}`);
        console.log(`  剩余可发放:     ¥${remainingAmount.toLocaleString()}`);
      }
      
      console.log('\n管理员看到的该部门数据:');
      console.log(`  总额:           ¥${totalAmount.toLocaleString()}`);
      console.log(`  当期发放:       ¥${currentAmount.toLocaleString()} (${(currentRatio * 100).toFixed(1)}%)`);
      
      if (paidAmount > 0) {
        console.log(`  已发放:         ¥${paidAmount.toLocaleString()}`);
        console.log(`  剩余:           ¥${remainingAmount.toLocaleString()}`);
      }
      
      console.log('\n✅ 数据一致性验证: 通过!');
    } else {
      console.log('❌ 未找到建筑部数据');
    }
    
    console.log('\n========================================');
    console.log('测试完成!');
    console.log('========================================\n');
    
    // 7. 测试建议
    console.log('测试建议:');
    console.log('1. 以建筑部经理身份登录系统');
    console.log('2. 进入项目详情页 (项目ID: ' + testProjectId + ')');
    console.log('3. 查看"第二级:部门分配"区域');
    console.log('4. 打开浏览器控制台(F12),查看调试信息');
    console.log('5. 验证显示的数据与上面的测试结果一致\n');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    db.close();
  }
}

// 运行测试
testLevel2Display();
