/**
 * 导出本地数据库数据为 JSON 格式
 * 用于迁移数据到 Railway 部署环境
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const tables = [
  'users',
  'departments',
  'projects',
  'air_conditioning_tables',
  'department_commissions',
  'department_allocations',
  'member_allocations',
  'employee_distributions',
  'payment_records',
  'project_additions'
];

async function exportTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`导出 ${tableName} 失败:`, err);
        resolve([]);
      } else {
        console.log(`✓ 导出 ${tableName}: ${rows.length} 条记录`);
        resolve(rows);
      }
    });
  });
}

async function exportDatabase() {
  console.log('开始导出数据库...\n');
  
  const data = {};
  
  for (const table of tables) {
    data[table] = await exportTable(table);
  }
  
  const outputPath = path.join(__dirname, 'database-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ 数据导出完成！`);
  console.log(`文件位置: ${outputPath}`);
  console.log(`\n数据统计:`);
  
  for (const table of tables) {
    console.log(`  ${table}: ${data[table].length} 条`);
  }
  
  db.close();
}

exportDatabase().catch(err => {
  console.error('导出失败:', err);
  process.exit(1);
});
