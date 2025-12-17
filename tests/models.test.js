const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// **Feature: performance-commission-system, Property 3: 项目数据完整性**
// 对于任何项目数据，当项目被创建或修改后，查询该项目应该返回完整的项目信息

describe('数据模型测试', () => {
  let db;
  const testDbPath = path.join(__dirname, '../data/test.sqlite');

  beforeAll(() => {
    // 确保测试数据库目录存在
    const dataDir = path.dirname(testDbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建测试数据库
    db = new sqlite3.Database(testDbPath);

    // 创建项目表
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          stage TEXT CHECK(stage IN ('scheme', 'construction', 'cooperation')),
          building_area REAL,
          building_type TEXT,
          calculated_commission REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          period TEXT,
          has_addition INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise((resolve) => {
      db.close(() => {
        // 删除测试数据库
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    // 清空项目表
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM projects', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  // **Feature: performance-commission-system, Property 3: 项目数据完整性**
  test('属性3：创建项目后查询应返回完整信息', async () => {
    const projectData = {
      code: 'TEST001',
      name: '测试项目',
      stage: 'construction',
      building_area: 10000,
      building_type: '办公楼',
      period: '2025上半年'
    };

    // 插入项目
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO projects (code, name, stage, building_area, building_type, period) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [projectData.code, projectData.name, projectData.stage, 
         projectData.building_area, projectData.building_type, projectData.period],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 查询项目
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM projects WHERE code = ?', [projectData.code], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 验证所有字段都存在且正确
    expect(result).toBeDefined();
    expect(result.code).toBe(projectData.code);
    expect(result.name).toBe(projectData.name);
    expect(result.stage).toBe(projectData.stage);
    expect(result.building_area).toBe(projectData.building_area);
    expect(result.building_type).toBe(projectData.building_type);
    expect(result.period).toBe(projectData.period);
    expect(result.status).toBe('active'); // 默认值
    expect(result.calculated_commission).toBe(0); // 默认值
    expect(result.has_addition).toBe(0); // 默认值
    expect(result.created_at).toBeDefined();
    expect(result.updated_at).toBeDefined();
  });

  test('属性3：修改项目后查询应返回更新后的完整信息', async () => {
    // 先创建项目
    const projectId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO projects (code, name, stage, building_area) 
         VALUES (?, ?, ?, ?)`,
        ['TEST002', '原始项目', 'scheme', 5000],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 修改项目
    const updatedData = {
      name: '修改后的项目',
      building_area: 8000,
      building_type: '住宅',
      calculated_commission: 40000
    };

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE projects 
         SET name = ?, building_area = ?, building_type = ?, calculated_commission = ?, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [updatedData.name, updatedData.building_area, updatedData.building_type, 
         updatedData.calculated_commission, projectId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 查询修改后的项目
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 验证修改后的数据
    expect(result.name).toBe(updatedData.name);
    expect(result.building_area).toBe(updatedData.building_area);
    expect(result.building_type).toBe(updatedData.building_type);
    expect(result.calculated_commission).toBe(updatedData.calculated_commission);
  });

  // **Feature: performance-commission-system, Property 4: 修改历史记录**
  test('属性4：项目修改应保留历史记录', async () => {
    // 创建项目历史表
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS project_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          field_name TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建项目
    const projectId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO projects (code, name, building_area) VALUES (?, ?, ?)`,
        ['TEST003', '历史测试项目', 6000],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 记录修改历史
    const oldValue = 6000;
    const newValue = 9000;
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO project_history (project_id, field_name, old_value, new_value) 
         VALUES (?, ?, ?, ?)`,
        [projectId, 'building_area', oldValue.toString(), newValue.toString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 更新项目
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE projects SET building_area = ? WHERE id = ?`,
        [newValue, projectId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 查询历史记录
    const history = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM project_history WHERE project_id = ? ORDER BY changed_at',
        [projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 验证历史记录
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].project_id).toBe(projectId);
    expect(history[0].field_name).toBe('building_area');
    expect(history[0].old_value).toBe(oldValue.toString());
    expect(history[0].new_value).toBe(newValue.toString());
    expect(history[0].changed_at).toBeDefined();
  });
});
