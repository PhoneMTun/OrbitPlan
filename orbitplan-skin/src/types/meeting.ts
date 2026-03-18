export type MeetingSource = "upload" | "record";
export type MeetingStatus = "created" | "processing" | "ready" | "approved" | "error";

export type Meeting = {
  id: string;
  title: string;
  scheduledAt?: string;
  attendees: string[];
  source: MeetingSource;
  status: MeetingStatus;
  actionsConfirmed: boolean;
  createdAt: string;
  processingError?: string;
  processingStartedAt?: string;
};
