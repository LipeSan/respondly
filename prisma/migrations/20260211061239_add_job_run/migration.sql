-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('sync_reviews', 'auto_responder');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('running', 'success', 'failed');

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processed" INTEGER NOT NULL DEFAULT 0,
    "responded" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_businessId_type_idx" ON "JobRun"("businessId", "type");

-- CreateIndex
CREATE INDEX "JobRun_businessId_createdAt_idx" ON "JobRun"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
