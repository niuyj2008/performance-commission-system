/**
 * 从 JSON 文件导入数据到数据库
 * 用于在 Railway 部署环境中恢复数据
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function importTable(tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`⊘ ${tableName}: 无数据`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const values = columns.map(col => row[col]);
    
    await new Promise((resolve) => {
      db.run(sql, values, (err) => {
        if (err) {
          console.error(`  ✗ 插入失败:`, err.message);
          errorCount++;
        } else {
          successCount++;
        }
        resolve();
      });
    });
  }

  console.log(`✓ ${tableName}: ${successCount} 条成功, ${errorCount} 条失败`);
}

async function importDatabase() {
  const dataPath = path.join(__dirname, 'database-export.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ 找不到 database-export.json 文件');
    console.log('请先运行: node export-database.js');
    process.exit(1);
  }

  console.log('开始导入数据...\n');
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // 按照外键依赖顺序导入
  const importOrder = [
    'departments',
    'users',
    'projects',
    'air_conditioning_tables',
    'department_commissions',
    'department_allocations',
    'member_allocations',
    'employee_distributions',
    'payment_records',
    'project_additions'
  ];

  for (const table of importOrder) {
    if (data[table]) {
      await importTable(table, data[table]);
    }
  }

  console.log('\n✅ 数据导入完成！');
  
  db.close();
}

importDatabase().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
