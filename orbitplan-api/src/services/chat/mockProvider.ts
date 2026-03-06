import type { MeetingChatInput, MeetingChatProvider, MeetingChatResponse } from "./types.js";

const pickCitations = (input: MeetingChatInput): string[] => {
  const citations: string[] = [];
  if (input.summary?.decisions) citations.push(`Decisions: ${input.summary.decisions}`);
  if (input.actions[0]) citations.push(`Action: ${input.actions[0].description} (${input.actions[0].ownerEmail})`);
  if (citations.length === 0 && input.transcript) citations.push(input.transcript.slice(0, 180));
  return citations.slice(0, 2);
};

export class MockMeetingChatProvider implements MeetingChatProvider {
  async ask(input: MeetingChatInput): Promise<MeetingChatResponse> {
    const lower = input.question.toLowerCase();

    if (lower.includes("decision")) {
      return {
        answer: input.summary?.decisions || "No explicit decisions found. Please review the transcript.",
        citations: pickCitations(input),
      };
    }

    if (lower.includes("owner") || lower.includes("who")) {
      const action = input.actions[0];
      return {
        answer: action
          ? `Current top action owner is ${action.ownerEmail} for: ${action.description}`
          : "No action owner is available yet.",
        citations: pickCitations(input),
      };
    }

    return {
      answer:
        "Based on this meeting context, key items are in Decisions, Risks, and Actions. Ask about owners, deadlines, blockers, or next steps for a focused answer.",
      citations: pickCitations(input),
    };
  }
}
