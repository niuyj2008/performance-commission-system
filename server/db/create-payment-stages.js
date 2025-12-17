const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 创建提成发放阶段表
db.serialize(() => {
  // 提成发放阶段表
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      stage_date TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      previous_ratio REAL NOT NULL DEFAULT 0,
      current_ratio REAL NOT NULL,
      total_ratio REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('创建 payment_stages 表失败:', err);
    } else {
      console.log('✓ payment_stages 表创建成功');
    }
  });
  
  // 创建索引
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_payment_stages_project 
    ON payment_stages(project_id)
  `, (err) => {
    if (err) {
      console.error('创建索引失败:', err);
    } else {
      console.log('✓ 索引创建成功');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('关闭数据库失败:', err);
  } else {
    console.log('\n数据库表创建完成！');
  }
});
