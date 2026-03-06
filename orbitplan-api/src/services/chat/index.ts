import { env } from "../../config/env.js";
import { MockMeetingChatProvider } from "./mockProvider.js";
import { OpenAiMeetingChatProvider } from "./openaiProvider.js";
import type { MeetingChatProvider } from "./types.js";

export const createMeetingChatProvider = (): MeetingChatProvider => {
  if (env.chatProvider === "openai") {
    if (!env.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required when CHAT_PROVIDER=openai");
    }
    return new OpenAiMeetingChatProvider(env.openAiApiKey);
  }

  return new MockMeetingChatProvider();
};
