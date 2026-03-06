import { prisma } from "../lib/prisma.js";
import type { JiraOAuthToken } from "../types/jira.js";

const JIRA_CONNECTION_ID = "default";

export const getJiraToken = async (): Promise<JiraOAuthToken | null> => {
  const token = await prisma.jiraConnection.findUnique({
    where: { id: JIRA_CONNECTION_ID },
  });

  if (!token) return null;
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? undefined,
    expiresAt: token.expiresAt.toISOString(),
    scope: token.scope ?? undefined,
  };
};

export const saveJiraToken = async (token: JiraOAuthToken) => {
  await prisma.jiraConnection.upsert({
    where: { id: JIRA_CONNECTION_ID },
    update: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ?? null,
      expiresAt: new Date(token.expiresAt),
      scope: token.scope ?? null,
    },
    create: {
      id: JIRA_CONNECTION_ID,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ?? null,
      expiresAt: new Date(token.expiresAt),
      scope: token.scope ?? null,
    },
  });
};

export const clearJiraToken = async () => {
  await prisma.jiraConnection.deleteMany({
    where: { id: JIRA_CONNECTION_ID },
  });
};
