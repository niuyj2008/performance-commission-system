const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 检查列是否已存在
  db.all("PRAGMA table_info(employee_distributions)", (err, rows) => {
    if (err) {
      console.error('检查表结构失败:', err);
      db.close();
      return;
    }
    
    const hasColumn = rows.some(col => col.name === 'payment_stage_id');
    
    if (!hasColumn) {
      console.log('添加 payment_stage_id 列到 employee_distributions 表...');
      db.run(`
        ALTER TABLE employee_distributions 
        ADD COLUMN payment_stage_id INTEGER REFERENCES payment_stages(id)
      `, (err) => {
        if (err) {
          console.error('添加列失败:', err);
        } else {
          console.log('✓ 列添加成功');
        }
        db.close();
      });
    } else {
      console.log('✓ payment_stage_id 列已存在');
      db.close();
    }
  });
});
