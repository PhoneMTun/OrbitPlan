import OpenAI from "openai";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { MeetingChatInput, MeetingChatProvider, MeetingChatResponse } from "./types.js";

const ChatSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(z.string()).default([]),
});

const fallback = (input: MeetingChatInput): MeetingChatResponse => ({
  answer: "I could not produce a reliable answer from the current context. Please ask a narrower question.",
  citations: [input.summary?.decisions ?? input.transcript.slice(0, 180)].filter(Boolean),
});

export class OpenAiMeetingChatProvider implements MeetingChatProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async ask(input: MeetingChatInput): Promise<MeetingChatResponse> {
    const context = {
      meetingTitle: input.meetingTitle,
      attendees: input.attendees,
      summary: input.summary,
      actions: input.actions,
      transcript: input.transcript,
    };

    const completion = await this.client.chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Answer only using provided meeting context. If the answer is not clearly present, say you do not have enough evidence. " +
              "If the user asks for a translation, translate only using content that is present in the provided transcript or meeting context. " +
              "When translating, preserve meaning, be explicit if the requested source text is not actually present, and do not invent missing lines. " +
              "Return strict JSON with keys: answer (string), citations (array of short quote-like snippets from provided context).",
          },
          {
            role: "user",
            content: JSON.stringify({ question: input.question, context }),
          },
        ],
      },
      { timeout: env.aiTimeoutMs },
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback(input);

    try {
      const parsed = ChatSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return fallback(input);
      return {
        answer: parsed.data.answer,
        citations: parsed.data.citations.slice(0, 3),
      };
    } catch {
      return fallback(input);
    }
  }
}
