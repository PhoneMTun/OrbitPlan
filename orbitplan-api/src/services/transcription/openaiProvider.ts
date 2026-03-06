import fs from "node:fs";
import OpenAI from "openai";
import { env } from "../../config/env.js";
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from "./types.js";

export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const transcription = await this.client.audio.transcriptions.create({
      file: fs.createReadStream(input.filePath),
      model: "gpt-4o-mini-transcribe",
    }, {
      timeout: env.aiTimeoutMs,
    });

    return { text: transcription.text };
  }
}
