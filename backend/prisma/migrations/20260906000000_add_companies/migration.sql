CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "domain" TEXT,
  "country" TEXT NOT NULL DEFAULT 'India',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "logoUrl" TEXT,
  "hrContactEmail" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

INSERT INTO "Company" ("id", "name", "slug", "domain", "country", "timezone", "hrContactEmail", "isActive", "updatedAt")
VALUES ('network18-default-company', 'Network18', 'network18', 'nw18.com', 'India', 'Asia/Kolkata', 'hr@nw18.com', true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "Employee" ADD COLUMN "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EmployeeDocument" ADD COLUMN "companyId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "companyId" TEXT;

UPDATE "Employee" SET "companyId" = 'network18-default-company' WHERE "companyId" IS NULL;
UPDATE "User" SET "companyId" = 'network18-default-company' WHERE "companyId" IS NULL;
UPDATE "EmployeeProfile" SET "companyId" = 'network18-default-company' WHERE "companyId" IS NULL;
UPDATE "EmployeeDocument" SET "companyId" = 'network18-default-company' WHERE "companyId" IS NULL;
UPDATE "AuditLog" SET "companyId" = 'network18-default-company' WHERE "companyId" IS NULL;

ALTER TABLE "Employee" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EmployeeProfile" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EmployeeDocument" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "EmployeeProfile_companyId_idx" ON "EmployeeProfile"("companyId");
CREATE INDEX "EmployeeDocument_companyId_idx" ON "EmployeeDocument"("companyId");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");
