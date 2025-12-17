const fetch = require('node-fetch');

async function testPersonalAllocationAPI() {
  try {
    // 1. 登录获取token
    console.log('1. 登录...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error('登录失败: ' + JSON.stringify(loginData));
    }
    
    const token = loginData.token;
    console.log('✓ 登录成功');
    
    // 2. 获取项目2的个人分配数据
    console.log('\n2. 获取项目2的个人分配数据...');
    const allocResponse = await fetch('http://localhost:3000/api/personal-allocation/2', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const allocData = await allocResponse.json();
    if (!allocResponse.ok) {
      throw new Error('获取个人分配失败: ' + JSON.stringify(allocData));
    }
    
    console.log('✓ 获取成功');
    console.log('\n部门分配汇总:');
    console.log(JSON.stringify(allocData.summary, null, 2));
    console.log('\n个人分配列表:');
    console.log(JSON.stringify(allocData.allocations, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
  }
}

testPersonalAllocationAPI();
