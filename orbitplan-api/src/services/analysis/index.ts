import { env } from "../../config/env.js";
import { MockAnalysisProvider } from "./mockProvider.js";
import { OpenAiAnalysisProvider } from "./openaiProvider.js";
import type { AnalysisProvider } from "./types.js";

export const createAnalysisProvider = (): AnalysisProvider => {
  if (env.analysisProvider === "openai") {
    if (!env.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required when ANALYSIS_PROVIDER=openai");
    }
    return new OpenAiAnalysisProvider(env.openAiApiKey);
  }

  return new MockAnalysisProvider();
};

