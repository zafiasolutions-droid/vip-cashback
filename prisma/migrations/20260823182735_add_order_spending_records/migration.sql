-- CreateTable
CREATE TABLE "OrderSpendingRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "eligibleAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT,
    "financialStatus" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderSpendingRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrderSpendingRecord_shopId_idx" ON "OrderSpendingRecord"("shopId");

-- CreateIndex
CREATE INDEX "OrderSpendingRecord_customerId_idx" ON "OrderSpendingRecord"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSpendingRecord_shopId_shopifyOrderId_key" ON "OrderSpendingRecord"("shopId", "shopifyOrderId");
