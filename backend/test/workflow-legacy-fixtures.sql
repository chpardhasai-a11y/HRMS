INSERT INTO "Company" (id,name,slug,"updatedAt") VALUES ('legacy-co','Legacy company','legacy-co',NOW());
INSERT INTO "Employee" (id,"companyId",code,name,email,role,department,entity,location,manager,type,grade,"joinDate","updatedAt") VALUES ('legacy-employee','legacy-co','LEGACY-001','Legacy Employee','legacy@workflow.test','Analyst','Operations','QA','Mumbai','Manager','Permanent','G1',NOW(),NOW());
INSERT INTO "EmployeeProfile" (id,"companyId","employeeCode","bankDetails","updatedAt") VALUES ('legacy-profile','legacy-co','LEGACY-001','[["Bank Name","Preserved Bank"]]',NOW());
INSERT INTO "AuditLog" (id,"companyId","employeeCode",action) VALUES ('legacy-audit','legacy-co','LEGACY-001','PRESERVE_EXISTING_AUDIT');
INSERT INTO "ApprovalRequest" (id,"companyId","employeeCode","employeeName",department,role,category,status,changes,"updatedAt") VALUES ('legacy-request','legacy-co','LEGACY-001','Legacy Employee','Operations','Analyst','Documents','Pending','[]',NOW());
INSERT INTO "WorkflowDefinition" (id,"companyId",code,name,module,"updatedAt") VALUES ('legacy-workflow','legacy-co','OLD','Old workflow','profile_change',NOW());
INSERT INTO "WorkflowStep" (id,"workflowDefinitionId","stepOrder",name,"updatedAt") VALUES ('legacy-step','legacy-workflow',1,'Old review',NOW());
INSERT INTO "WorkflowInstance" (id,"companyId","workflowDefinitionId",module,"entityId","requesterCode","updatedAt") VALUES ('legacy-instance','legacy-co','legacy-workflow','profile_change','legacy-request','LEGACY-001',NOW());
INSERT INTO "WorkflowStepInstance" (id,"workflowInstanceId","workflowStepId","stepOrder","updatedAt") VALUES ('legacy-step-instance','legacy-instance','legacy-step',1,NOW());
