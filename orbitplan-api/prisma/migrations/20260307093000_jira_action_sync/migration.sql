ALTER TABLE "ActionItem"
ADD COLUMN "jiraIssueKey" TEXT,
ADD COLUMN "jiraIssueUrl" TEXT,
ADD COLUMN "jiraCloudId" TEXT,
ADD COLUMN "jiraProjectKey" TEXT;

CREATE UNIQUE INDEX "ActionItem_jiraIssueKey_key" ON "ActionItem"("jiraIssueKey");
