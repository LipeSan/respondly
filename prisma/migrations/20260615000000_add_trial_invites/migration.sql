-- CreateTable
CREATE TABLE "TrialInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "email" TEXT,
    "reservedAt" TIMESTAMP(3),
    "reservedByUserId" TEXT,
    "reservedByBusinessId" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByBusinessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialInvite_code_key" ON "TrialInvite"("code");

-- CreateIndex
CREATE INDEX "TrialInvite_email_idx" ON "TrialInvite"("email");

-- CreateIndex
CREATE INDEX "TrialInvite_usedAt_idx" ON "TrialInvite"("usedAt");

-- CreateIndex
CREATE INDEX "TrialInvite_reservedAt_idx" ON "TrialInvite"("reservedAt");

-- AddForeignKey
ALTER TABLE "TrialInvite" ADD CONSTRAINT "TrialInvite_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialInvite" ADD CONSTRAINT "TrialInvite_reservedByBusinessId_fkey" FOREIGN KEY ("reservedByBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialInvite" ADD CONSTRAINT "TrialInvite_usedByBusinessId_fkey" FOREIGN KEY ("usedByBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

