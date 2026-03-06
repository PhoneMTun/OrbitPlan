import type { ActionItem } from "./action";
import type { ChatMessage } from "./chat";
import type { Meeting } from "./meeting";

export type MeetingFile = {
  id: string;
  meetingId: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
};

export type MeetingTranscript = {
  id: string;
  meetingId: string;
  text: string;
  createdAt: string;
};

export type MeetingSummary = {
  id: string;
  meetingId: string;
  decisions: string;
  risks: string;
  notes: string;
  createdAt: string;
};

export type EmailLog = {
  id: string;
  meetingId: string;
  recipient: string;
  type: "summary" | "action";
  payload: Record<string, string>;
  sentAt: string;
};

export type MeetingDetail = {
  meeting: Meeting;
  files: MeetingFile[];
  transcript: MeetingTranscript | null;
  summary: MeetingSummary | null;
  actions: ActionItem[];
  emailLogs: EmailLog[];
  chatMessages?: ChatMessage[];
};
