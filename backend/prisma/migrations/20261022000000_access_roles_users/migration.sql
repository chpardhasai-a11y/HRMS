ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "User_companyId_id_key" ON "User"("companyId", "id");
CREATE UNIQUE INDEX "AccessLevel_companyId_id_key" ON "AccessLevel"("companyId", "id");
CREATE TABLE "AccessRole" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "description" TEXT NOT NULL DEFAULT '', "levelId" TEXT NOT NULL,
 "permissionKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "isActive" BOOLEAN NOT NULL DEFAULT true,
 "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AccessRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AccessRole_companyId_levelId_fkey" FOREIGN KEY ("companyId", "levelId") REFERENCES "AccessLevel"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccessRole_companyId_id_key" ON "AccessRole"("companyId", "id");
CREATE UNIQUE INDEX "AccessRole_companyId_name_key" ON "AccessRole"("companyId", "name");
CREATE INDEX "AccessRole_companyId_isActive_idx" ON "AccessRole"("companyId", "isActive");
CREATE TABLE "AccessUserRole" (
 "companyId" TEXT NOT NULL, "userId" TEXT NOT NULL, "roleId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AccessUserRole_pkey" PRIMARY KEY ("userId", "roleId"),
 CONSTRAINT "AccessUserRole_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "User"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AccessUserRole_companyId_roleId_fkey" FOREIGN KEY ("companyId", "roleId") REFERENCES "AccessRole"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccessUserRole_companyId_roleId_idx" ON "AccessUserRole"("companyId", "roleId");
