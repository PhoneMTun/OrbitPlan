CREATE TYPE "JiraSyncStatus" AS ENUM ('not_linked', 'synced', 'sync_failed');

ALTER TABLE "ActionItem"
ADD COLUMN "jiraSyncStatus" "JiraSyncStatus" NOT NULL DEFAULT 'not_linked',
ADD COLUMN "jiraSyncError" TEXT;
