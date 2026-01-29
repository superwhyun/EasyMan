-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "llmProvider" TEXT NOT NULL DEFAULT 'openai',
    "llmApiKey" TEXT,
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-5.2',
    "systemPrompt" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailFrequency" TEXT NOT NULL DEFAULT 'daily',
    "deliveryTime" TEXT NOT NULL DEFAULT '09:00 AM',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("deliveryTime", "emailEnabled", "emailFrequency", "id", "llmApiKey", "llmModel", "llmProvider", "updatedAt") SELECT "deliveryTime", "emailEnabled", "emailFrequency", "id", "llmApiKey", "llmModel", "llmProvider", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
