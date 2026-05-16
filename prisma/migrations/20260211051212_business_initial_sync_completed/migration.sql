-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "connectedAt" TIMESTAMP(3),
ADD COLUMN     "initialSyncCompleted" BOOLEAN NOT NULL DEFAULT false;
