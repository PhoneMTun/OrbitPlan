export type EmailLogType = "summary" | "action";

export type EmailLog = {
  id: string;
  meetingId: string;
  recipient: string;
  type: EmailLogType;
  payload: Record<string, string>;
  sentAt: string;
};

