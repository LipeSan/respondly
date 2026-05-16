-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
