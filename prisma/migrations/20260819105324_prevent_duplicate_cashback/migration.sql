/*
  Warnings:

  - You are about to drop the column `minimumPurchaseAmount` on the `AppSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shop,orderId]` on the table `CashbackLedger` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "cashbackPercentage" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("cashbackPercentage", "createdAt", "id", "shop", "updatedAt") SELECT "cashbackPercentage", "createdAt", "id", "shop", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CashbackLedger_shop_orderId_key" ON "CashbackLedger"("shop", "orderId");
