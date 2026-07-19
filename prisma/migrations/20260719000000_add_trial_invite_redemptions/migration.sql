-- CreateTable
CREATE TABLE "TrialInviteRedemption" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialInviteRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialInviteRedemption_inviteId_businessId_key" ON "TrialInviteRedemption"("inviteId", "businessId");

-- CreateIndex
CREATE INDEX "TrialInviteRedemption_inviteId_createdAt_idx" ON "TrialInviteRedemption"("inviteId", "createdAt");

-- CreateIndex
CREATE INDEX "TrialInviteRedemption_businessId_createdAt_idx" ON "TrialInviteRedemption"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrialInviteRedemption" ADD CONSTRAINT "TrialInviteRedemption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "TrialInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialInviteRedemption" ADD CONSTRAINT "TrialInviteRedemption_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
