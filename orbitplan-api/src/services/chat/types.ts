export type MeetingChatInput = {
  meetingTitle: string;
  attendees: string[];
  transcript: string;
  summary: {
    decisions: string;
    risks: string;
    notes: string;
  } | null;
  actions: Array<{
    description: string;
    ownerEmail: string;
    dueDate?: string;
    status: string;
    priority?: string;
  }>;
  question: string;
};

export type MeetingChatResponse = {
  answer: string;
  citations: string[];
};

export interface MeetingChatProvider {
  ask(input: MeetingChatInput): Promise<MeetingChatResponse>;
}
