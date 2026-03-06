export type MeetingChatResponse = {
  answer: string;
  citations: string[];
  messages?: ChatMessage[];
};

export type MeetingChatHistoryResponse = {
  messages: ChatMessage[];
  nextBefore: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  createdAt?: string;
};
