const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 检查数据库是否需要恢复生产数据
async function restoreProductionDataIfNeeded() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data', 'database.sqlite');
  const backupPath = path.join(__dirname, 'backup', 'production.sqlite');
  
  console.log('检查数据库状态...');
  console.log('数据库路径:', dbPath);
  console.log('备份路径:', backupPath);
  
  // 确保 data 目录存在
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('创建 data 目录:', dataDir);
  }

  return new Promise((resolve, reject) => {
    // 如果数据库文件不存在，直接从备份恢复
    if (!fs.existsSync(dbPath)) {
      if (fs.existsSync(backupPath)) {
        console.log('数据库文件不存在，从备份恢复...');
        fs.copyFileSync(backupPath, dbPath);
        console.log('✓ 生产数据已从备份恢复');
        resolve(true);
        return;
      } else {
        console.log('⚠ 警告：数据库和备份文件都不存在');
        resolve(false);
        return;
      }
    }

    // 数据库存在，检查是否需要恢复
    const db = new sqlite3.Database(dbPath);

    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        console.error('查询用户数量失败:', err);
        db.close();
        
        // 如果查询失败，可能是数据库损坏，尝试从备份恢复
        if (fs.existsSync(backupPath)) {
          console.log('数据库可能损坏，从备份恢复...');
          fs.copyFileSync(backupPath, dbPath);
          console.log('✓ 生产数据已从备份恢复');
          resolve(true);
        } else {
          reject(err);
        }
        return;
      }

      const userCount = row.count;
      console.log(`当前数据库用户数: ${userCount}`);

      // 如果用户数少于 3（只有 admin 和 finance），说明是新数据库，需要恢复
      if (userCount < 3 && fs.existsSync(backupPath)) {
        console.log('检测到空数据库，正在从备份恢复...');
        db.close();

        // 复制备份文件
        fs.copyFileSync(backupPath, dbPath);
        console.log('✓ 生产数据已从备份恢复');
        resolve(true);
      } else if (userCount < 3 && !fs.existsSync(backupPath)) {
        console.log('⚠ 警告：数据库为空但未找到备份文件');
        db.close();
        resolve(false);
      } else {
        console.log('✓ 数据库已包含生产数据');
        db.close();
        resolve(false);
      }
    });
  });
}

module.exports = { restoreProductionDataIfNeeded };
