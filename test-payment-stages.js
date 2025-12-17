/**
 * 测试发放节点功能
 */

const API_BASE = 'http://localhost:3000/api';

// 测试用的token（需要先登录获取）
let token = '';

async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  const data = await response.json();
  if (data.token) {
    token = data.token;
    console.log('✓ 登录成功');
    return true;
  }
  console.error('✗ 登录失败:', data);
  return false;
}

async function testGetPaymentStages(projectId = 2) {
  console.log('\n=== 测试获取发放节点 ===');
  const response = await fetch(`${API_BASE}/payment-stages/${projectId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  console.log('状态码:', response.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  
  if (response.ok) {
    console.log('✓ 获取发放节点成功');
    return data.stages || [];
  } else {
    console.log('✗ 获取发放节点失败');
    return [];
  }
}

async function testCreatePaymentStages(projectId = 2) {
  console.log('\n=== 测试创建发放节点 ===');
  
  const stages = [
    {
      stage_date: '202001',
      stage_name: '施工图',
      previous_ratio: 0,
      current_ratio: 0.75,
      total_ratio: 0.75
    },
    {
      stage_date: '202007',
      stage_name: '施工图修改',
      previous_ratio: 0.75,
      current_ratio: 0.20,
      total_ratio: 0.95
    },
    {
      stage_date: '202101',
      stage_name: '施工图完成',
      previous_ratio: 0.95,
      current_ratio: 0.05,
      total_ratio: 1.0
    }
  ];
  
  const response = await fetch(`${API_BASE}/payment-stages/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ stages })
  });
  
  const data = await response.json();
  console.log('状态码:', response.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  
  if (response.ok) {
    console.log('✓ 创建发放节点成功');
    return true;
  } else {
    console.log('✗ 创建发放节点失败');
    return false;
  }
}

async function testPersonalAllocationWithStage(projectId = 2) {
  console.log('\n=== 测试个人分配（带发放节点）===');
  
  // 先获取发放节点
  const stages = await testGetPaymentStages(projectId);
  if (stages.length === 0) {
    console.log('⚠ 没有发放节点，跳过测试');
    return;
  }
  
  const firstStage = stages[0];
  console.log('使用发放节点:', firstStage.stage_name, `(${(firstStage.current_ratio * 100).toFixed(1)}%)`);
  
  // 测试保存个人分配
  const allocations = [
    {
      employee_id: 1,
      amount: 5000,
      notes: '测试分配',
      payment_stage_id: firstStage.id
    }
  ];
  
  const response = await fetch(`${API_BASE}/personal-allocation/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ allocations })
  });
  
  const data = await response.json();
  console.log('状态码:', response.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  
  if (response.ok) {
    console.log('✓ 保存个人分配成功');
  } else {
    console.log('✗ 保存个人分配失败');
  }
}

async function runTests() {
  console.log('开始测试发放节点功能...\n');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('登录失败，终止测试');
    return;
  }
  
  // 2. 获取现有发放节点
  const existingStages = await testGetPaymentStages();
  
  // 3. 如果没有发放节点，创建一些
  if (existingStages.length === 0) {
    await testCreatePaymentStages();
    await testGetPaymentStages();
  }
  
  // 4. 测试个人分配（带发放节点）
  await testPersonalAllocationWithStage();
  
  console.log('\n测试完成！');
}

runTests().catch(console.error);
