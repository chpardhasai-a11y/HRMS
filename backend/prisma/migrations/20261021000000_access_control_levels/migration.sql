CREATE TABLE "AccessLevel" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "number" INTEGER NOT NULL CHECK ("number" > 0),
  "displayName" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessLevel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccessLevel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccessLevel_companyId_number_key" ON "AccessLevel"("companyId", "number");
CREATE INDEX "AccessLevel_companyId_isActive_idx" ON "AccessLevel"("companyId", "isActive");
