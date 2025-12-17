# 第三级个人分配功能需求文档

## Introduction

本文档定义第三级个人分配功能的需求。该功能允许部门经理为项目分配本部门的参与人员，并为每个人员分配具体的提成金额。

## Glossary

- **System**: 绩效提成管理系统
- **Department Manager**: 部门经理，负责管理本部门的员工和项目分配
- **Participant**: 项目参与人员，参与项目并获得提成的员工
- **Department Allocation**: 部门分配金额，第二级计算出的部门提成总额
- **Personal Allocation**: 个人分配金额，分配给具体员工的提成金额
- **Project**: 项目，需要计算和分配提成的工程项目

## Requirements

### Requirement 1

**User Story:** As a department manager, I want to view my department's allocation for a project, so that I know how much commission I can distribute to my team members.

#### Acceptance Criteria

1. WHEN a department manager views a project detail page THEN the System SHALL display only their department's allocation amount from Level 2
2. WHEN the department allocation is zero or not calculated THEN the System SHALL display a message indicating no allocation is available
3. WHEN displaying the department allocation THEN the System SHALL show the total amount, allocated amount, and remaining amount

### Requirement 2

**User Story:** As a department manager, I want to select participants from my department for a project, so that I can assign commission to team members who worked on the project.

#### Acceptance Criteria

1. WHEN a department manager clicks "Assign Participants" THEN the System SHALL display a list of employees from their department
2. WHEN selecting participants THEN the System SHALL allow multiple selections
3. WHEN an employee is already assigned to the project THEN the System SHALL indicate their current allocation
4. WHEN saving participant selections THEN the System SHALL validate that all selected employees belong to the manager's department

### Requirement 3

**User Story:** As a department manager, I want to input commission amounts for each participant, so that I can fairly distribute the department's allocation based on each person's contribution.

#### Acceptance Criteria

1. WHEN inputting allocation amounts THEN the System SHALL validate that each amount is greater than zero
2. WHEN the total allocated amount exceeds the department allocation THEN the System SHALL prevent saving and display an error message
3. WHEN saving allocations THEN the System SHALL update the remaining amount in real-time
4. WHEN all amounts are valid THEN the System SHALL save the personal allocations to the database

### Requirement 4

**User Story:** As a department manager, I want to edit existing personal allocations, so that I can adjust the distribution if needed.

#### Acceptance Criteria

1. WHEN viewing existing allocations THEN the System SHALL display each participant's name and allocated amount
2. WHEN editing an allocation THEN the System SHALL allow changing the amount
3. WHEN removing a participant THEN the System SHALL return their allocation to the remaining amount
4. WHEN saving changes THEN the System SHALL validate the total does not exceed the department allocation

### Requirement 5

**User Story:** As an administrator, I want to view all personal allocations across all departments for a project, so that I can oversee the complete distribution.

#### Acceptance Criteria

1. WHEN an administrator views Level 3 THEN the System SHALL display allocations for all departments
2. WHEN displaying allocations THEN the System SHALL group them by department
3. WHEN a department has no allocations THEN the System SHALL indicate "Not yet allocated"
4. WHEN displaying totals THEN the System SHALL show allocated and remaining amounts for each department

### Requirement 6

**User Story:** As a department manager, I want the system to prevent over-allocation, so that I cannot distribute more than my department's total allocation.

#### Acceptance Criteria

1. WHEN the sum of personal allocations equals the department allocation THEN the System SHALL indicate the allocation is complete
2. WHEN attempting to save an over-allocation THEN the System SHALL reject the save and display the excess amount
3. WHEN calculating remaining amount THEN the System SHALL subtract all personal allocations from the department allocation
4. WHEN the remaining amount is negative THEN the System SHALL display it in red with a warning

### Requirement 7

**User Story:** As a department manager, I want to see allocation history, so that I can track changes and understand the distribution timeline.

#### Acceptance Criteria

1. WHEN viewing personal allocations THEN the System SHALL display the creation date for each allocation
2. WHEN an allocation is modified THEN the System SHALL update the modification timestamp
3. WHEN viewing allocation history THEN the System SHALL show who created or modified each allocation
4. WHEN displaying timestamps THEN the System SHALL use a consistent date-time format

### Requirement 8

**User Story:** As a system, I want to maintain data integrity between levels, so that the sum of personal allocations never exceeds department allocations.

#### Acceptance Criteria

1. WHEN calculating Level 2 department allocations THEN the System SHALL store them in the database
2. WHEN creating personal allocations THEN the System SHALL reference the department allocation
3. WHEN the department allocation changes THEN the System SHALL flag existing personal allocations for review
4. WHEN validating personal allocations THEN the System SHALL always check against the current department allocation
