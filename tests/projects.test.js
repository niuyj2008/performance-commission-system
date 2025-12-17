const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

describe('项目管理测试', () => {
  let db;
  const testDbPath = path.join(__dirname, '../data/test-projects.sqlite');

  beforeAll(() => {
    const dataDir = path.dirname(testDbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(testDbPath);

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // 创建项目表
        db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            stage TEXT,
            building_area REAL,
            building_type TEXT,
            calculated_commission REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            period TEXT,
            has_addition INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 创建项目追加表
        db.run(`
          CREATE TABLE IF NOT EXISTS project_additions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            addition_number INTEGER NOT NULL,
            building_area_change REAL,
            new_total_commission REAL NOT NULL,
            incremental_commission REAL NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });

  afterAll(() => {
    return new Promise((resolve) => {
      db.close(() => {
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM project_additions', (err) => {
          if (err) reject(err);
        });
        db.run('DELETE FROM projects', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });

  // **Feature: performance-commission-system, Property 13: 追加历史累计记录**
  // 对于任何项目，当项目有多次追加时，查询项目应该返回所有追加记录，且追加记录应该按时间顺序排列
  
  describe('属性13：追加历史累计记录', () => {
    test('项目有多次追加时应该累计记录所有追加', async () => {
      // 创建项目
      const projectId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO projects (code, name, building_area, calculated_commission) 
           VALUES (?, ?, ?, ?)`,
          ['TEST001', '测试项目', 10000, 50000],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // 添加第一次追加
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO project_additions 
           (project_id, addition_number, building_area_change, new_total_commission, incremental_commission) 
           VALUES (?, ?, ?, ?, ?)`,
          [projectId, 1, 2000, 60000, 10000],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // 添加第二次追加
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO project_additions 
           (project_id, addition_number, building_area_change, new_total_commission, incremental_commission) 
           VALUES (?, ?, ?, ?, ?)`,
          [projectId, 2, 3000, 75000, 15000],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // 添加第三次追加
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO project_additions 
           (project_id, addition_number, building_area_change, new_total_commission, incremental_commission) 
           VALUES (?, ?, ?, ?, ?)`,
          [projectId, 3, 1000, 80000, 5000],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // 查询所有追加记录
      const additions = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM project_additions WHERE project_id = ? ORDER BY addition_number',
          [projectId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // 验证所有追加都被记录
      expect(additions.length).toBe(3);
      
      // 验证追加按顺序排列
      expect(additions[0].addition_number).toBe(1);
      expect(additions[1].addition_number).toBe(2);
      expect(additions[2].addition_number).toBe(3);
      
      // 验证追加数据完整
      expect(additions[0].new_total_commission).toBe(60000);
      expect(additions[0].incremental_commission).toBe(10000);
      
      expect(additions[1].new_total_commission).toBe(75000);
      expect(additions[1].incremental_commission).toBe(15000);
      
      expect(additions[2].new_total_commission).toBe(80000);
      expect(additions[2].incremental_commission).toBe(5000);
      
      // 验证每条记录都有时间戳
      additions.forEach(addition => {
        expect(addition.created_at).toBeDefined();
      });
    });

    test('没有追加的项目应该返回空的追加列表', async () => {
      // 创建项目但不添加追加
      const projectId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO projects (code, name, building_area) VALUES (?, ?, ?)`,
          ['TEST002', '无追加项目', 5000],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // 查询追加记录
      const additions = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM project_additions WHERE project_id = ?',
          [projectId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // 验证没有追加记录
      expect(additions.length).toBe(0);
    });

    test('追加记录应该包含完整的变更信息', async () => {
      const projectId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO projects (code, name, building_area, calculated_commission) 
           VALUES (?, ?, ?, ?)`,
          ['TEST003', '详细追加测试', 8000, 40000],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      const additionData = {
        building_area_change: 2500,
        new_total_commission: 52500,
        incremental_commission: 12500,
        notes: '客户要求增加地下室'
      };

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO project_additions 
           (project_id, addition_number, building_area_change, new_total_commission, 
            incremental_commission, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [projectId, 1, additionData.building_area_change, additionData.new_total_commission,
           additionData.incremental_commission, additionData.notes],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const addition = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM project_additions WHERE project_id = ? AND addition_number = ?',
          [projectId, 1],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // 验证所有字段都被正确保存
      expect(addition.building_area_change).toBe(additionData.building_area_change);
      expect(addition.new_total_commission).toBe(additionData.new_total_commission);
      expect(addition.incremental_commission).toBe(additionData.incremental_commission);
      expect(addition.notes).toBe(additionData.notes);
    });
  });
});
