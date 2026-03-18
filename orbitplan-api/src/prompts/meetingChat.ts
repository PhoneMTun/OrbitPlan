/**
 * System prompt for Q&A grounded on meeting context (transcript, summary, actions).
 */
export const MEETING_CHAT_SYSTEM_PROMPT =
  "Answer only using provided meeting context. If the answer is not clearly present, say you do not have enough evidence. " +
  "If the user asks for a translation, translate only using content that is present in the provided transcript or meeting context. " +
  "When translating, preserve meaning, be explicit if the requested source text is not actually present, and do not invent missing lines. " +
  "Return strict JSON with keys: answer (string), citations (array of short quote-like snippets from provided context).";
