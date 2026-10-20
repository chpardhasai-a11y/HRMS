-- Intentionally deletes legacy workflow data; HR business records are retained.
BEGIN;

-- DropForeignKey
ALTER TABLE "WorkflowDefinition" DROP CONSTRAINT "WorkflowDefinition_companyId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowStep" DROP CONSTRAINT "WorkflowStep_workflowDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowInstance" DROP CONSTRAINT "WorkflowInstance_companyId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowInstance" DROP CONSTRAINT "WorkflowInstance_workflowDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowStepInstance" DROP CONSTRAINT "WorkflowStepInstance_workflowInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowStepInstance" DROP CONSTRAINT "WorkflowStepInstance_workflowStepId_fkey";

-- DropTable
DROP TABLE "WorkflowDefinition";

-- DropTable
DROP TABLE "WorkflowStep";

-- DropTable
DROP TABLE "WorkflowInstance";

-- DropTable
DROP TABLE "WorkflowStepInstance";

-- DropEnum
DROP TYPE "WorkflowStatus";

-- DropEnum
DROP TYPE "WorkflowStepType";

-- DropEnum
DROP TYPE "ApproverType";

-- DropEnum
DROP TYPE "WorkflowInstanceStatus";

-- DropEnum
DROP TYPE "StepInstanceStatus";

-- CreateTable
CREATE TABLE "FlowDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "draft" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowVersion" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowInstance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "state" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "entityId" TEXT,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowToken" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "groupId" TEXT,
    "branch" TEXT,
    "scope" JSONB NOT NULL DEFAULT '[]',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowTask" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "candidates" JSONB NOT NULL,
    "claimedBy" TEXT,
    "votes" JSONB NOT NULL DEFAULT '[]',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceId" TEXT,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "lockedBy" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "nodeId" TEXT,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "instanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowBinding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "outcomes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowMembership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,

    CONSTRAINT "FlowMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowHeartbeat" (
    "id" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowDefinition_companyId_status_idx" ON "FlowDefinition"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FlowVersion_definitionId_number_key" ON "FlowVersion"("definitionId", "number");

-- CreateIndex
CREATE INDEX "FlowInstance_companyId_status_createdAt_idx" ON "FlowInstance"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FlowInstance_companyId_source_entityId_idx" ON "FlowInstance"("companyId", "source", "entityId");

-- CreateIndex
CREATE INDEX "FlowToken_instanceId_status_idx" ON "FlowToken"("instanceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FlowTask_tokenId_key" ON "FlowTask"("tokenId");

-- CreateIndex
CREATE INDEX "FlowTask_companyId_status_dueAt_idx" ON "FlowTask"("companyId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlowJob_key_key" ON "FlowJob"("key");

-- CreateIndex
CREATE INDEX "FlowJob_status_dueAt_leaseUntil_idx" ON "FlowJob"("status", "dueAt", "leaseUntil");

-- CreateIndex
CREATE INDEX "FlowEvent_companyId_instanceId_createdAt_idx" ON "FlowEvent"("companyId", "instanceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlowReceipt_companyId_key_key" ON "FlowReceipt"("companyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FlowBinding_companyId_source_key" ON "FlowBinding"("companyId", "source");

-- CreateIndex
CREATE INDEX "FlowRecord_companyId_type_idx" ON "FlowRecord"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FlowMembership_companyId_userId_kind_referenceId_key" ON "FlowMembership"("companyId", "userId", "kind", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowAttachment_storageKey_key" ON "FlowAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "FlowAttachment_companyId_instanceId_idx" ON "FlowAttachment"("companyId", "instanceId");

-- CreateIndex
CREATE INDEX "FlowConnection_companyId_idx" ON "FlowConnection"("companyId");

-- AddForeignKey
ALTER TABLE "FlowDefinition" ADD CONSTRAINT "FlowDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "FlowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInstance" ADD CONSTRAINT "FlowInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInstance" ADD CONSTRAINT "FlowInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "FlowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInstance" ADD CONSTRAINT "FlowInstance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "FlowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowToken" ADD CONSTRAINT "FlowToken_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FlowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowTask" ADD CONSTRAINT "FlowTask_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FlowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowEvent" ADD CONSTRAINT "FlowEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FlowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowBinding" ADD CONSTRAINT "FlowBinding_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "FlowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve HR requests while retiring legacy execution.
UPDATE "ApprovalRequest" SET "status" = 'Awaiting Configuration' WHERE "status" = 'Pending';

COMMIT;
