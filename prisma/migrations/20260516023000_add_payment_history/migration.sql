-- CreateTable
CREATE TABLE "PaymentHistory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripeEventType" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "invoicePdf" TEXT,
    "rawEvent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHistory_stripeEventId_key" ON "PaymentHistory"("stripeEventId");

-- CreateIndex
CREATE INDEX "PaymentHistory_businessId_createdAt_idx" ON "PaymentHistory"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentHistory_stripeInvoiceId_idx" ON "PaymentHistory"("stripeInvoiceId");

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
