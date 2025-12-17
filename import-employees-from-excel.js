const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 从Excel提取的员工信息
const employees = [
  // 建筑部 (ARCH - department_id: 5)
  { name: '余晓华', username: 'yuxiaohua', bank_card: '6226200302042479', department_id: 5, role: 'employee' },
  { name: '陈锐康', username: 'chenruikang', bank_card: '6226200300104461', department_id: 5, role: 'employee' },
  { name: '李成佳', username: 'lichengjia', bank_card: '6226200302042313', department_id: 5, role: 'employee' },
  { name: '麦明冰', username: 'maimingbing', bank_card: '6226200301627668', department_id: 5, role: 'employee' },
  
  // 结构部 (STRUCT - department_id: 6)
  { name: '冯健明', username: 'fengjianming', bank_card: '6226200300080737', department_id: 6, role: 'employee' },
  { name: '陈文睿', username: 'chenwenrui', bank_card: '6226220314501254', department_id: 6, role: 'employee' },
  { name: '陆小龙', username: 'luxiaolong', bank_card: '6226200302627782', department_id: 6, role: 'employee' },
  { name: '刘明洁', username: 'liumingjie', bank_card: '6226200302628061', department_id: 6, role: 'employee' },
  
  // 给排水部 (PLUMB - department_id: 7)
  { name: '曹活辉', username: 'caohuohui', bank_card: '6226200301898236', department_id: 7, role: 'employee' },
  { name: '林东泽', username: 'lindongze', bank_card: '6226200302042446', department_id: 7, role: 'employee' },
  { name: '谭志尧', username: 'tanzhiyao', bank_card: '6226220332678530', department_id: 7, role: 'employee' },
  
  // 电气部 (ELEC - department_id: 8)
  { name: '江志翔', username: 'jiangzhixiang', bank_card: '6226200300080844', department_id: 8, role: 'employee' },
  { name: '梁杵兴', username: 'liangchuxing', bank_card: '6226220332678621', department_id: 8, role: 'employee' },
  { name: '饶剑芳', username: 'raojianfang', bank_card: '6226220381308781', department_id: 8, role: 'employee' },
  
  // 空调部 (HVAC - department_id: 9)
  { name: '黄挺源', username: 'huangtingyuan', bank_card: '6226200301898269', department_id: 9, role: 'employee' },
  { name: '钟文', username: 'zhongwen', bank_card: '6226200301898228', department_id: 9, role: 'employee' },
  
  // 行政/财务人员 (无部门)
  { name: '陈小凤', username: 'chenxiaofeng', bank_card: '6226200302042164', department_id: null, role: 'employee' },
  { name: '曾晓韵', username: 'zengxiaoyun', bank_card: '6226200302628202', department_id: null, role: 'employee' },
  { name: '李卉', username: 'lihui', bank_card: '6226200300080661', department_id: null, role: 'employee' },
  { name: '陈通高', username: 'chentonggao', bank_card: '6226220308885978', department_id: null, role: 'employee' }
];

// 默认密码
const defaultPassword = 'password123';

async function importEmployees() {
  console.log('开始导入员工信息...\n');
  
  // 生成密码哈希
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const emp of employees) {
    try {
      // 检查用户名是否已存在
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE username = ?', [emp.username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (existing) {
        console.log(`⊘ 跳过: ${emp.name} (${emp.username}) - 用户名已存在`);
        skipCount++;
        continue;
      }
      
      // 插入员工
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (username, password_hash, name, role, department_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [emp.username, passwordHash, emp.name, emp.role, emp.department_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      const deptName = emp.department_id ? 
        ['', '', '', '', '', '建筑部', '结构部', '给排水部', '电气部', '空调部'][emp.department_id] : 
        '无部门';
      
      console.log(`✓ 成功: ${emp.name} (${emp.username}) - ${deptName}`);
      successCount++;
      
    } catch (error) {
      console.error(`✗ 失败: ${emp.name} (${emp.username}) - ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n导入完成！');
  console.log(`成功: ${successCount} 人`);
  console.log(`跳过: ${skipCount} 人`);
  console.log(`失败: ${errorCount} 人`);
  console.log(`\n默认密码: ${defaultPassword}`);
  console.log('建议用户首次登录后修改密码。');
  
  db.close();
}

// 执行导入
importEmployees().catch(error => {
  console.error('导入失败:', error);
  db.close();
  process.exit(1);
});
