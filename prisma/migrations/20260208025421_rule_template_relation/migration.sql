-- CreateIndex
CREATE INDEX "ReviewRule_businessId_priority_idx" ON "ReviewRule"("businessId", "priority");

-- AddForeignKey
ALTER TABLE "ReviewRule" ADD CONSTRAINT "ReviewRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReviewTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
