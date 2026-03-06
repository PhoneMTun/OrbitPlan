import { env } from "../../config/env.js";
import { MockTranscriptionProvider } from "./mockProvider.js";
import { OpenAiTranscriptionProvider } from "./openaiProvider.js";
import type { TranscriptionProvider } from "./types.js";

export const createTranscriptionProvider = (): TranscriptionProvider => {
  if (env.transcriptionProvider === "openai") {
    if (!env.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required when TRANSCRIPTION_PROVIDER=openai");
    }
    return new OpenAiTranscriptionProvider(env.openAiApiKey);
  }

  return new MockTranscriptionProvider();
};

