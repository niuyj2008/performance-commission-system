const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db/init');
const { seedDatabase } = require('./db/seed');
const { restoreProductionDataIfNeeded } = require('./db/restore-production-data');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const projectsRoutes = require('./routes/projects');
const commissionRoutes = require('./routes/commission');
const airConditioningRoutes = require('./routes/air-conditioning');
const departmentDistributionRoutes = require('./routes/department-distribution');
const configRoutes = require('./routes/config');
const paymentRoutes = require('./routes/payment');
const personalAllocationRoutes = require('./routes/personal-allocation');
const paymentStagesRoutes = require('./routes/payment-stages');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 根路径重定向到登录页
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '系统运行正常' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/air-conditioning', airConditioningRoutes);
app.use('/api/department-distribution', departmentDistributionRoutes);
app.use('/api/config', configRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/personal-allocation', personalAllocationRoutes);
app.use('/api/payment-stages', paymentStagesRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器错误', 
    message: err.message 
  });
});

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    // 尝试恢复生产数据
    return restoreProductionDataIfNeeded();
  })
  .then((restored) => {
    // 只在环境变量 SEED_DATABASE=true 时才运行 seed
    // 并且只在没有恢复生产数据的情况下
    if (!restored && process.env.SEED_DATABASE === 'true') {
      return seedDatabase();
    }
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`数据库已初始化`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });

module.exports = app;
