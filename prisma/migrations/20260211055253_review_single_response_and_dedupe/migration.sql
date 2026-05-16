/*
  Warnings:

  - A unique constraint covering the columns `[businessId,source,externalId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reviewId]` on the table `ReviewResponse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Review_businessId_status_idx" ON "Review"("businessId", "status");

-- CreateIndex
CREATE INDEX "Review_businessId_createdAtGoogle_idx" ON "Review"("businessId", "createdAtGoogle");

-- CreateIndex
CREATE UNIQUE INDEX "Review_businessId_source_externalId_key" ON "Review"("businessId", "source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");
