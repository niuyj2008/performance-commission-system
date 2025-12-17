# 员工信息导入总结

## 数据来源
从 `/Users/tima/Documents/ZhangHR/2025上半年/2025年2月至7月设计奖.xlsx` 文件中提取员工信息。

## 导入结果
✅ **成功导入 20 名员工**

### 部门分布

#### 建筑部 (4人)
- 余晓华 (yuxiaohua)
- 陈锐康 (chenruikang)
- 李成佳 (lichengjia)
- 麦明冰 (maimingbing)

#### 结构部 (4人)
- 冯健明 (fengjianming)
- 陈文睿 (chenwenrui)
- 陆小龙 (luxiaolong)
- 刘明洁 (liumingjie)

#### 给排水部 (3人)
- 曹活辉 (caohuohui)
- 林东泽 (lindongze)
- 谭志尧 (tanzhiyao)

#### 电气部 (3人)
- 江志翔 (jiangzhixiang)
- 梁杵兴 (liangchuxing)
- 饶剑芳 (raojianfang)

#### 空调部 (2人)
- 黄挺源 (huangtingyuan)
- 钟文 (zhongwen)

#### 行政/财务人员 (4人 - 无部门)
- 陈小凤 (chenxiaofeng)
- 曾晓韵 (zengxiaoyun)
- 李卉 (lihui)
- 陈通高 (chentonggao)

## 登录信息

### 默认密码
所有新导入的员工默认密码为：`password123`

### 用户名规则
用户名采用姓名拼音格式，例如：
- 余晓华 → yuxiaohua
- 冯健明 → fengjianming

## 使用说明

### 员工登录
1. 访问系统登录页面：http://localhost:3000/login.html
2. 使用用户名和默认密码登录
3. **建议首次登录后立即修改密码**

### 部门经理权限
部门经理可以：
- 查看和管理本部门员工
- 查看本部门的项目提成分配
- 为本部门员工分配个人提成

### 测试建议
1. 使用不同部门的员工账号登录测试
2. 验证部门经理能否看到本部门员工
3. 测试个人分配功能是否正常工作

## 导入脚本
导入脚本文件：`import-employees-from-excel.js`

如需重新导入或导入更多员工，可以：
1. 编辑脚本中的 `employees` 数组
2. 运行命令：`node import-employees-from-excel.js`

## 数据库验证
查看所有员工：
```bash
sqlite3 data/database.sqlite "SELECT u.id, u.name, u.username, u.role, d.name as department FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.role = 'employee' ORDER BY u.department_id, u.name;"
```

## 注意事项
1. 部门分配基于员工姓名和常见职位特点推断
2. 如有部门分配错误，可通过员工管理界面修改
3. 行政/财务人员暂未分配部门，可根据实际情况调整
4. 所有员工角色设置为 'employee'，如需设置部门经理，请通过管理员账号修改

## 下一步操作
1. ✅ 员工信息已导入
2. ⏭️ 测试员工登录功能
3. ⏭️ 为需要的员工设置部门经理角色
4. ⏭️ 测试个人分配功能
5. ⏭️ 提醒员工修改默认密码
