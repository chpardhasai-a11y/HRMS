CREATE TYPE "UserRole" AS ENUM ('employee', 'hr_admin', 'super_admin');
CREATE TYPE "EmployeeStatus" AS ENUM ('Active', 'OnLeave', 'Inactive', 'Resigned', 'Terminated');

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "role" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "manager" TEXT NOT NULL,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'Active',
  "type" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "joinDate" TIMESTAMP(3) NOT NULL,
  "documentNote" TEXT NOT NULL DEFAULT 'No recent uploads',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'employee',
  "employeeCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeProfile" (
  "id" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "gender" TEXT,
  "maritalStatus" TEXT,
  "bloodGroup" TEXT,
  "nationality" TEXT,
  "emergencyContact" TEXT,
  "emergencyPhone" TEXT,
  "workMode" TEXT,
  "noticePeriod" TEXT,
  "shift" TEXT,
  "businessUnit" TEXT,
  "team" TEXT,
  "costCenter" TEXT,
  "hrPartner" TEXT,
  "currentAddress" TEXT,
  "permanentAddress" TEXT,
  "previousEmployment" JSONB,
  "education" JSONB,
  "bankDetails" JSONB,
  "statutoryDetails" JSONB,
  "salaryDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeDocument" (
  "id" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "EmployeeProfile_employeeCode_key" ON "EmployeeProfile"("employeeCode");

ALTER TABLE "User" ADD CONSTRAINT "User_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeCode_fkey" FOREIGN KEY ("employeeCode") REFERENCES "Employee"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
