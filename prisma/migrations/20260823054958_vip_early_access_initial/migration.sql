/*
  Warnings:

  - You are about to drop the `AppSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CashbackLedger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `cashbackBalance` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `shopId` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AppSettings_shop_key";

-- DropIndex
DROP INDEX "CashbackLedger_shop_orderId_key";

-- DropIndex
DROP INDEX "CashbackLedger_shop_idx";

-- DropIndex
DROP INDEX "CashbackLedger_customerId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CashbackLedger";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Shop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domain" TEXT NOT NULL,
    "timezone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EarlyAccessEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "productTitleSnapshot" TEXT,
    "vipStartAt" DATETIME NOT NULL,
    "publicReleaseAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EarlyAccessEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualVip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualVip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpendingRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "threshold" REAL NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'PERMANENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SpendingRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerSpending" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "eligibleAmount" REAL NOT NULL DEFAULT 0,
    "vipUnlockedAt" DATETIME,
    "lastCalculatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerSpending_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwitchChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TwitchChannel_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwitchConnection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "isSubscriber" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TwitchConnection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailAutomation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timingType" TEXT,
    "timingValue" INTEGER,
    "customSendAt" DATETIME,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailAutomation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "earlyAccessEventId" INTEGER,
    "automationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailLog_earlyAccessEventId_fkey" FOREIGN KEY ("earlyAccessEventId") REFERENCES "EarlyAccessEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "email", "firstName", "id", "lastName", "shopifyCustomerId", "updatedAt") SELECT "createdAt", "email", "firstName", "id", "lastName", "shopifyCustomerId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_shopId_idx" ON "Customer"("shopId");
CREATE UNIQUE INDEX "Customer_shopId_shopifyCustomerId_key" ON "Customer"("shopId", "shopifyCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE INDEX "EarlyAccessEvent_shopId_idx" ON "EarlyAccessEvent"("shopId");

-- CreateIndex
CREATE INDEX "EarlyAccessEvent_shopifyProductId_idx" ON "EarlyAccessEvent"("shopifyProductId");

-- CreateIndex
CREATE INDEX "EarlyAccessEvent_vipStartAt_idx" ON "EarlyAccessEvent"("vipStartAt");

-- CreateIndex
CREATE INDEX "EarlyAccessEvent_publicReleaseAt_idx" ON "EarlyAccessEvent"("publicReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManualVip_customerId_key" ON "ManualVip"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SpendingRule_shopId_key" ON "SpendingRule"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSpending_customerId_key" ON "CustomerSpending"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchChannel_shopId_key" ON "TwitchChannel"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchChannel_twitchUserId_key" ON "TwitchChannel"("twitchUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchConnection_customerId_key" ON "TwitchConnection"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchConnection_twitchUserId_key" ON "TwitchConnection"("twitchUserId");

-- CreateIndex
CREATE INDEX "EmailAutomation_shopId_idx" ON "EmailAutomation"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAutomation_shopId_type_key" ON "EmailAutomation"("shopId", "type");

-- CreateIndex
CREATE INDEX "EmailLog_shopId_idx" ON "EmailLog"("shopId");

-- CreateIndex
CREATE INDEX "EmailLog_customerId_idx" ON "EmailLog"("customerId");

-- CreateIndex
CREATE INDEX "EmailLog_earlyAccessEventId_idx" ON "EmailLog"("earlyAccessEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_customerId_earlyAccessEventId_automationType_key" ON "EmailLog"("customerId", "earlyAccessEventId", "automationType");
