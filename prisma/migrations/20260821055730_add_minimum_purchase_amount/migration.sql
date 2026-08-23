-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "cashbackPercentage" REAL NOT NULL DEFAULT 1.0,
    "minimumPurchaseAmount" REAL NOT NULL DEFAULT 0,
    "excludedProductIds" TEXT NOT NULL DEFAULT '',
    "excludedCollectionIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("cashbackPercentage", "createdAt", "excludedCollectionIds", "excludedProductIds", "id", "shop", "updatedAt") SELECT "cashbackPercentage", "createdAt", "excludedCollectionIds", "excludedProductIds", "id", "shop", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
