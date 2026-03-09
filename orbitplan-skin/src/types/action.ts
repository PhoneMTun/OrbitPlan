export type ActionStatus = "open" | "in_progress" | "done";
export type ActionPriority = "low" | "medium" | "high";
export type JiraSyncStatus = "not_linked" | "synced" | "sync_failed";

export type ActionItem = {
  id: string;
  meetingId: string;
  ownerEmail: string;
  dueDate?: string;
  description: string;
  confidence: number;
  status: ActionStatus;
  priority: ActionPriority;
  jiraIssueKey?: string;
  jiraIssueUrl?: string;
  jiraCloudId?: string;
  jiraProjectKey?: string;
  jiraSyncStatus: JiraSyncStatus;
  jiraSyncError?: string;
  createdAt: string;
};
