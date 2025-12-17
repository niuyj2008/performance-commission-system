const { calculateTotalCommission, calculateAdditionCommission, calculateDepartmentAllocation } = require('../server/utils/commission');

describe('提成计算测试', () => {
  
  // **Feature: performance-commission-system, Property 5: 提成计算一致性**
  // 对于任何项目和计算公式，当使用相同的建筑属性和公式计算提成时，应该得到相同的结果
  
  describe('属性5：提成计算一致性', () => {
    test('相同的项目参数应该得到相同的提成结果', () => {
      const project = {
        building_area: 10000,
        building_type: 'office',
        stage: 'construction',
        attributes: {}
      };
      
      // 多次计算应该得到相同结果
      const result1 = calculateTotalCommission(project);
      const result2 = calculateTotalCommission(project);
      const result3 = calculateTotalCommission(project);
      
      expect(result1.totalCommission).toBe(result2.totalCommission);
      expect(result2.totalCommission).toBe(result3.totalCommission);
      expect(result1.totalCommission).toBe(50000); // 10000 * 5.0 * 1.0 = 50000
    });
    
    test('不同阶段的项目应该有不同的提成率', () => {
      const baseProject = {
        building_area: 10000,
        building_type: 'office',
        attributes: {}
      };
      
      const schemeProject = { ...baseProject, stage: 'scheme' };
      const constructionProject = { ...baseProject, stage: 'construction' };
      const cooperationProject = { ...baseProject, stage: 'cooperation' };
      
      const schemeResult = calculateTotalCommission(schemeProject);
      const constructionResult = calculateTotalCommission(constructionProject);
      const cooperationResult = calculateTotalCommission(cooperationProject);
      
      // 施工配合 < 方案阶段 < 施工图阶段
      // 方案: 10000 * 5.0 * 0.6 = 30000
      // 施工图: 10000 * 5.0 * 1.0 = 50000
      // 施工配合: 10000 * 5.0 * 0.4 = 20000
      expect(schemeResult.totalCommission).toBe(30000);
      expect(cooperationResult.totalCommission).toBe(20000);
      expect(constructionResult.totalCommission).toBe(50000);
      
      expect(cooperationResult.totalCommission).toBeLessThan(schemeResult.totalCommission);
      expect(schemeResult.totalCommission).toBeLessThan(constructionResult.totalCommission);
    });
    
    test('面积为0或负数应该抛出错误', () => {
      const invalidProject1 = { building_area: 0, building_type: 'office', stage: 'construction', attributes: {} };
      const invalidProject2 = { building_area: -1000, building_type: 'office', stage: 'construction', attributes: {} };
      
      expect(() => calculateTotalCommission(invalidProject1)).toThrow('建筑面积无效');
      expect(() => calculateTotalCommission(invalidProject2)).toThrow('建筑面积无效');
    });
    
    test('面积变化应该线性影响提成', () => {
      const project1 = { building_area: 5000, building_type: 'office', stage: 'construction', attributes: {} };
      const project2 = { building_area: 10000, building_type: 'office', stage: 'construction', attributes: {} };
      const project3 = { building_area: 15000, building_type: 'office', stage: 'construction', attributes: {} };
      
      const result1 = calculateTotalCommission(project1);
      const result2 = calculateTotalCommission(project2);
      const result3 = calculateTotalCommission(project3);
      
      // 面积翻倍，提成也应该翻倍
      expect(result2.totalCommission).toBe(result1.totalCommission * 2);
      expect(result3.totalCommission).toBe(result1.totalCommission * 3);
    });
    
    test('特殊属性应该增加提成', () => {
      const baseProject = {
        building_area: 10000,
        building_type: 'office',
        stage: 'construction',
        attributes: {}
      };
      
      const projectWithBasement = {
        ...baseProject,
        attributes: { hasBasement: true }
      };
      
      const baseResult = calculateTotalCommission(baseProject);
      const withBasementResult = calculateTotalCommission(projectWithBasement);
      
      // 有地下室应该增加15%
      expect(withBasementResult.totalCommission).toBeCloseTo(baseResult.totalCommission * 1.15, 2);
      expect(withBasementResult.totalCommission).toBe(57500); // 50000 * 1.15
    });
  });
  
  // **Feature: performance-commission-system, Property 6: 属性变化触发重算**
  // 对于任何项目，当其建筑属性发生变化时，系统应该重新计算提成总额
  
  describe('属性6：属性变化触发重算', () => {
    test('建筑面积变化应该导致提成变化', () => {
      const originalProject = {
        building_area: 10000,
        building_type: 'office',
        stage: 'construction',
        attributes: {}
      };
      
      const modifiedProject = {
        ...originalProject,
        building_area: 12000
      };
      
      const originalResult = calculateTotalCommission(originalProject);
      const modifiedResult = calculateTotalCommission(modifiedProject);
      
      // 面积增加，提成应该增加
      expect(modifiedResult.totalCommission).toBeGreaterThan(originalResult.totalCommission);
      expect(modifiedResult.totalCommission).toBe(60000); // 12000 * 5.0 * 1.0
      expect(originalResult.totalCommission).toBe(50000); // 10000 * 5.0 * 1.0
    });
    
    test('设计阶段变化应该导致提成变化', () => {
      const schemeProject = {
        building_area: 10000,
        building_type: 'office',
        stage: 'scheme',
        attributes: {}
      };
      
      const constructionProject = {
        ...schemeProject,
        stage: 'construction'
      };
      
      const schemeResult = calculateTotalCommission(schemeProject);
      const constructionResult = calculateTotalCommission(constructionProject);
      
      // 阶段从方案变为施工图，提成应该增加
      expect(constructionResult.totalCommission).toBeGreaterThan(schemeResult.totalCommission);
      expect(schemeResult.totalCommission).toBe(30000); // 10000 * 5.0 * 0.6
      expect(constructionResult.totalCommission).toBe(50000); // 10000 * 5.0 * 1.0
    });
    
    test('项目追加应该正确计算增量提成', () => {
      const originalProject = {
        building_area: 10000,
        building_type: 'office',
        stage: 'construction',
        attributes: {},
        calculated_commission: 50000
      };
      
      const newBuildingArea = 12000;
      const alreadyPaid = 20000;
      
      const result = calculateAdditionCommission(originalProject, newBuildingArea, alreadyPaid);
      
      // 新总额应该基于新面积
      expect(result.newTotalCommission).toBe(60000); // 12000 * 5.0 * 1.0
      
      // 增量提成 = 新总额 - 已发放
      expect(result.incrementalCommission).toBe(40000); // 60000 - 20000
    });
    
    test('追加计算应该考虑已发放金额', () => {
      const project = {
        building_area: 8000,
        building_type: 'office',
        stage: 'construction',
        attributes: {},
        calculated_commission: 40000
      };
      
      const newArea = 10000;
      
      // 情况1：没有发放过
      const result1 = calculateAdditionCommission(project, newArea, 0);
      expect(result1.incrementalCommission).toBe(50000); // 全部都是增量
      
      // 情况2：已发放一部分
      const result2 = calculateAdditionCommission(project, newArea, 30000);
      expect(result2.incrementalCommission).toBe(20000); // 50000 - 30000
      
      // 情况3：已全部发放
      const result3 = calculateAdditionCommission(project, newArea, 50000);
      expect(result3.incrementalCommission).toBe(0); // 50000 - 50000
    });
  });
  
  // 测试第二级：部门分配计算
  describe('部门分配计算', () => {
    test('应该根据空调面积表正确分配部门提成', () => {
      const totalCommission = 271176.18;
      const stage = 'construction';
      const airConditioningTable = [
        { ac_type: 'centralAC', area: 23215 },
        { ac_type: 'vrvWithPipe', area: 1795 },
        { ac_type: 'vrvWithoutPipe', area: 10277 }
      ];
      
      const result = calculateDepartmentAllocation(totalCommission, stage, airConditioningTable);
      
      // 应该返回各部门的分配金额
      expect(result.allocations).toBeDefined();
      expect(result.allocations.chief).toBeDefined();
      
      // 施工图阶段应该是85%
      expect(result.stageAmount).toBeCloseTo(totalCommission * 0.85, 2);
      
      // 总负责应该是施工图的7%
      expect(result.chiefAmount).toBeCloseTo(result.stageAmount * 0.07, 2);
      
      // 工种奖金应该是施工图的93%
      expect(result.departmentsAmount).toBeCloseTo(result.stageAmount * 0.93, 2);
      
      // 空调部在有中央空调时应该获得更多
      expect(result.allocations.hvac.amount).toBeGreaterThan(0);
      
      // 总分配应该等于阶段金额
      expect(result.totalAllocated).toBeCloseTo(result.stageAmount, 2);
    });
    
    test('方案阶段应该分配15%', () => {
      const totalCommission = 100000;
      const stage = 'scheme';
      const airConditioningTable = [
        { ac_type: 'centralAC', area: 10000 }
      ];
      
      const result = calculateDepartmentAllocation(totalCommission, stage, airConditioningTable);
      
      expect(result.stage).toBe('方案设计');
      expect(result.stageAmount).toBe(15000); // 100000 * 0.15
    });
    
    test('空调面积表为空应该抛出错误', () => {
      const totalCommission = 100000;
      const stage = 'construction';
      
      expect(() => calculateDepartmentAllocation(totalCommission, stage, [])).toThrow('空调面积表数据缺失');
      expect(() => calculateDepartmentAllocation(totalCommission, stage, null)).toThrow('空调面积表数据缺失');
    });
  });
});
