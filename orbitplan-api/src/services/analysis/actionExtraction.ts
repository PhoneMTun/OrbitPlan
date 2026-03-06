import type { AnalysisAction } from "./types.js";

const ACTION_HINT_REGEX =
  /\b(action item|action items|todo|to do|next step|next steps|follow up|owner|deadline|will|need to|needs to|should|must)\b/i;

const STRONG_ACTION_VERB_REGEX =
  /\b(send|share|review|finalize|confirm|schedule|book|create|draft|update|prepare|follow up|assign|deliver|complete|analyze|test|fix|ship|deploy|email)\b/i;
const EXECUTION_VERB_REGEX =
  /\b(create|define|assign|schedule|book|send|share|review|finalize|confirm|draft|update|prepare|deliver|complete|analyze|test|fix|ship|deploy|email|document|summarize|break|list|set|choose)\b/i;
const DELIVERABLE_REGEX =
  /\b(checklist|milestone|date|timeline|owner|owners|feature|features|scope|plan|copy|landing page|waitlist|pricing|hypothesis|interview|feedback|summary|task|tasks|fix|launch|report|notes)\b/i;
const NON_EXECUTION_REGEX =
  /\b(haha|lol|lmao|joke|kidding|just kidding|funny|cool|awesome|great idea|maybe|someday|hopefully|wish me luck|good luck|be big|be huge|unicorn|millionaire|billionaire)\b/i;
const VISION_ONLY_REGEX =
  /\b(i want|we want|would like|it would be cool|it would be nice|our dream|our vision)\b/i;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const splitCandidates = (transcript: string): string[] =>
  transcript
    .split(/\n|[.!?](?:\s+|$)/g)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 12);

const looksLikeText = (line: string) => {
  const safe = line.replace(/[^a-zA-Z0-9\s.,:@/-]/g, "");
  return safe.length >= Math.floor(line.length * 0.6);
};

const toImperative = (line: string) => {
  const cleaned = line.replace(/^(action items?|next steps?|todo)\s*[:\-]\s*/i, "").trim();
  const withCapital = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return withCapital.endsWith(".") ? withCapital.slice(0, -1) : withCapital;
};

const guessOwnerEmail = (description: string, attendees: string[]) => {
  const lower = description.toLowerCase();
  for (const attendee of attendees) {
    const local = attendee.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (local && lower.includes(local)) return attendee;
  }
  return attendees[0];
};

const isExecutableAction = (line: string, description: string) => {
  const lower = line.toLowerCase();
  if (NON_EXECUTION_REGEX.test(lower)) return false;
  if (VISION_ONLY_REGEX.test(lower) && !ACTION_HINT_REGEX.test(lower)) return false;
  if (description.length < 14) return false;

  const hasExecutionVerb = EXECUTION_VERB_REGEX.test(description);
  const hasDeliverable = DELIVERABLE_REGEX.test(description);
  const hasAssignmentSignal = /\b(owner|assign|due|deadline|follow up|next step|action item)\b/i.test(line);

  if (!hasExecutionVerb) return false;
  if (!(hasDeliverable || hasAssignmentSignal)) return false;

  const vagueOnly =
    /\b(do something|work on it|handle it|take care of it|figure it out|move forward|keep going)\b/i.test(description);
  if (vagueOnly) return false;

  return true;
};

export const extractActionsFromTranscript = (transcript: string, attendees: string[]): AnalysisAction[] => {
  const dedupe = new Set<string>();
  const actions: AnalysisAction[] = [];

  for (const line of splitCandidates(transcript)) {
    if (!looksLikeText(line)) continue;

    const isActionLike = ACTION_HINT_REGEX.test(line) || STRONG_ACTION_VERB_REGEX.test(line);
    if (!isActionLike) continue;

    const description = toImperative(line);
    if (description.length < 10 || description.length > 180) continue;
    if (!isExecutableAction(line, description)) continue;

    const key = description.toLowerCase();
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    actions.push({
      description,
      ownerEmail: guessOwnerEmail(description, attendees),
      confidence: ACTION_HINT_REGEX.test(line) ? 0.78 : 0.66,
    });

    if (actions.length >= 8) break;
  }

  return actions;
};

const addStarterAction = (
  results: AnalysisAction[],
  seen: Set<string>,
  description: string,
  ownerEmail: string | undefined,
  confidence: number,
) => {
  const key = description.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  results.push({ description, ownerEmail, confidence });
};

export const generateStarterActionsFromIntent = (
  transcript: string,
  attendees: string[],
  meetingTitle: string,
): AnalysisAction[] => {
  const owner = attendees[0] ?? "unassigned@orbitplan.local";
  const lower = `${meetingTitle} ${transcript}`.toLowerCase();
  const results: AnalysisAction[] = [];
  const seen = new Set<string>();
  const isStartupContext =
    /\b(start up|startup|saas|mvp|product|launch|founder|founding|user|customers?|pricing|waitlist|prototype|market)\b/.test(
      lower,
    );

  if (isStartupContext) {
    addStarterAction(results, seen, "Define the startup MVP scope and must-have features", owner, 0.66);
    addStarterAction(results, seen, "List the target users and core problem the product solves", owner, 0.65);
    addStarterAction(results, seen, "Set the next customer validation step and assign an owner", owner, 0.64);
  }

  if (/\blaunch|ship|release|go live|start up|startup|project\b/.test(lower)) {
    addStarterAction(results, seen, "Create a launch checklist for the project", owner, 0.64);
    addStarterAction(results, seen, "Define the next milestone and target date", owner, 0.62);
    addStarterAction(results, seen, "Assign owners for launch preparation tasks", owner, 0.61);
  }

  if (/\bmvp|prototype|product\b/.test(lower)) {
    addStarterAction(results, seen, "Break the MVP into product, design, and engineering tasks", owner, 0.64);
  }

  if (/\buser|customer|market|validation|interview\b/.test(lower)) {
    addStarterAction(results, seen, "Schedule customer interviews or feedback sessions", owner, 0.63);
  }

  if (/\bpricing|revenue|sales|business model\b/.test(lower)) {
    addStarterAction(results, seen, "Define the first pricing hypothesis and success criteria", owner, 0.62);
  }

  if (/\bwaitlist|landing page|marketing|growth\b/.test(lower)) {
    addStarterAction(results, seen, "Prepare a landing page or waitlist capture plan", owner, 0.62);
  }

  if (/\btest|testing|qa|try\b/.test(lower)) {
    addStarterAction(results, seen, "Document test findings and open follow-up fixes", owner, 0.63);
  }

  if (/\bmeeting|sync|plan|planning|mission\b/.test(lower)) {
    addStarterAction(results, seen, "Summarize the meeting decisions and share next steps", owner, 0.58);
  }

  if (results.length === 0) {
    addStarterAction(results, seen, "Define the startup goal for the next working session", owner, 0.58);
    addStarterAction(results, seen, "Choose one high-impact task that moves the product forward", owner, 0.57);
    addStarterAction(results, seen, "Assign an owner and target date for the next milestone", owner, 0.56);
  }

  return results.slice(0, 5);
};
