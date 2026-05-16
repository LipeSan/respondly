/*
  Warnings:

  - You are about to drop the column `googleReviewId` on the `Review` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Review_googleReviewId_key";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "googleReviewId",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'mock';
