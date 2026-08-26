-- CreateTable
CREATE TABLE "EarlyAccessCollection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "shopifyCollectionId" TEXT NOT NULL,
    "titleSnapshot" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EarlyAccessCollection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EarlyAccessCollection_shopId_idx" ON "EarlyAccessCollection"("shopId");

-- CreateIndex
CREATE INDEX "EarlyAccessCollection_shopifyCollectionId_idx" ON "EarlyAccessCollection"("shopifyCollectionId");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessCollection_shopId_shopifyCollectionId_key" ON "EarlyAccessCollection"("shopId", "shopifyCollectionId");
