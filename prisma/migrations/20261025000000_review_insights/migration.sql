-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'review_insights';

-- CreateEnum
CREATE TYPE "ReviewInsightStatus" AS ENUM ('ready', 'insufficient_data', 'failed');

-- CreateTable
CREATE TABLE "ReviewInsight" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "ReviewInsightStatus" NOT NULL DEFAULT 'ready',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "strengths" JSONB,
    "improvements" JSONB,
    "model" TEXT,
    "error" TEXT,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewInsight_businessId_periodEnd_key" ON "ReviewInsight"("businessId", "periodEnd");

-- CreateIndex
CREATE INDEX "ReviewInsight_businessId_createdAt_idx" ON "ReviewInsight"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewInsight" ADD CONSTRAINT "ReviewInsight_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
