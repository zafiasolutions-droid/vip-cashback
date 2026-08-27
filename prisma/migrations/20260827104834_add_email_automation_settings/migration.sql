-- CreateTable
CREATE TABLE "EmailAutomationSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "earlyAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
    "earlyAccessSubject" TEXT NOT NULL DEFAULT 'VIP Early Access: {{product}} is live',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailAutomationSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAutomationSettings_shopId_key" ON "EmailAutomationSettings"("shopId");
