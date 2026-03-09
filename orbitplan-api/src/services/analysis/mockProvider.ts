import type { AnalysisInput, AnalysisProvider, AnalysisResult } from "./types.js";
import { extractActionsFromTranscript, finalizeActions, generateStarterActionsFromIntent } from "./actionExtraction.js";

const firstSentence = (value: string) => value.split(/[.!?]\s/).find((item) => item.trim().length > 0)?.trim();

export class MockAnalysisProvider implements AnalysisProvider {
  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const decision = firstSentence(input.transcript) ?? "No clear decision detected. Review transcript.";
    const summary = input.transcript.slice(0, 300).trim() || `Auto-generated notes for: ${input.meetingTitle}`;
    const extractedActions = extractActionsFromTranscript(input.transcript, input.attendees);
    const starterActions = generateStarterActionsFromIntent(input.transcript, input.attendees, input.meetingTitle);

    return {
      decisions: `- ${decision}`,
      risks: "Review action owners and due dates before approval.",
      notes: ["Summary:", summary, "", "Next Steps:", "- Confirm owners", "- Confirm due dates"].join("\n"),
      actions: finalizeActions(extractedActions, starterActions, input.attendees),
    };
  }
}
