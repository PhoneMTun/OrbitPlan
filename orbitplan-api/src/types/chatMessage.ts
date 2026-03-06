export type MeetingChatMessage = {
  id: string;
  meetingId: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  createdAt: string;
};
