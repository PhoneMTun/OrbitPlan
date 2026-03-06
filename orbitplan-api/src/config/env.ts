import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER ?? "mock",
  analysisProvider: process.env.ANALYSIS_PROVIDER ?? "mock",
  chatProvider: process.env.CHAT_PROVIDER ?? process.env.ANALYSIS_PROVIDER ?? "mock",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 180000),
  openAiApiKey: process.env.OPENAI_API_KEY,
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@orbitplan.local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "OrbitPlanAdmin123!",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  jiraClientId: process.env.JIRA_CLIENT_ID,
  jiraClientSecret: process.env.JIRA_CLIENT_SECRET,
  jiraRedirectUri: process.env.JIRA_REDIRECT_URI,
};
