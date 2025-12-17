const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保data目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 初始化数据库表
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'finance', 'manager', 'employee')),
          department_id INTEGER,
          email TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 部门表
      db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          manager_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (manager_id) REFERENCES users(id)
        )
      `);

      // 项目表
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          stage TEXT CHECK(stage IN ('scheme', 'construction', 'cooperation')),
          building_area REAL,
          building_type TEXT,
          has_basement INTEGER DEFAULT 0,
          has_civil_defense INTEGER DEFAULT 0,
          is_green_building INTEGER DEFAULT 0,
          is_prefabricated INTEGER DEFAULT 0,
          is_reporting_project INTEGER DEFAULT 0,
          is_review_project INTEGER DEFAULT 0,
          calculated_commission REAL DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
          period TEXT,
          has_addition INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 空调面积表
      db.run(`
        CREATE TABLE IF NOT EXISTS air_conditioning_tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          ac_type TEXT NOT NULL,
          location TEXT,
          area REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      // 部门提成表
      db.run(`
        CREATE TABLE IF NOT EXISTS department_commissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          department_id INTEGER NOT NULL,
          ratio REAL NOT NULL,
          amount REAL NOT NULL,
          calculation_basis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (department_id) REFERENCES departments(id)
        )
      `);

      // 部门分配表（基于空调面积表计算）
      db.run(`
        CREATE TABLE IF NOT EXISTS department_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          department_id TEXT NOT NULL,
          allocated_amount REAL NOT NULL,
          allocation_weight REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, department_id),
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      // 部门内分配表
      db.run(`
        CREATE TABLE IF NOT EXISTS member_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          department_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          ratio REAL NOT NULL,
          notes TEXT,
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'paid')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (department_id) REFERENCES departments(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // 员工分配表（部门内分配）
      db.run(`
        CREATE TABLE IF NOT EXISTS employee_distributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          department_id TEXT NOT NULL,
          employee_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, department_id, employee_id),
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (employee_id) REFERENCES users(id)
        )
      `);

      // 发放记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS payment_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_date DATE NOT NULL,
          payment_batch TEXT,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // 项目追加表
      db.run(`
        CREATE TABLE IF NOT EXISTS project_additions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          addition_number INTEGER NOT NULL,
          building_area_change REAL,
          new_total_commission REAL NOT NULL,
          incremental_commission REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('数据库表初始化完成');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initDatabase };
