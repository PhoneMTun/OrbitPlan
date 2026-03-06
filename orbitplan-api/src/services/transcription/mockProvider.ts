import fs from "node:fs";
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from "./types.js";

export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const isMedia = input.mimeType.startsWith("audio/") || input.mimeType.startsWith("video/");

    if (isMedia) {
      return {
        text:
          "Mock transcription mode cannot decode audio/video content. " +
          "Set TRANSCRIPTION_PROVIDER=openai and OPENAI_API_KEY to generate real transcript text.",
      };
    }

    const snippet = fs.readFileSync(input.filePath, "utf8").slice(0, 1000).trim();
    return { text: snippet || "No readable text content found in file." };
  }
}
