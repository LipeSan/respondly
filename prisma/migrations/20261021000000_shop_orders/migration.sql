-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('pending', 'paid', 'shipped', 'canceled');

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'aud',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "email" TEXT,
    "shippingName" TEXT,
    "shippingAddress" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_stripeSessionId_key" ON "ShopOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "ShopOrder_businessId_createdAt_idx" ON "ShopOrder"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

