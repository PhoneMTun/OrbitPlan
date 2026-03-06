export type ActionStatus = "open" | "in_progress" | "done";
export type ActionPriority = "low" | "medium" | "high";

export type ActionItem = {
  id: string;
  meetingId: string;
  ownerEmail: string;
  dueDate?: string;
  description: string;
  confidence: number;
  status: ActionStatus;
  priority: ActionPriority;
  createdAt: string;
};
