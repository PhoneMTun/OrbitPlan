import { URLSearchParams } from "node:url";
import { env } from "../../config/env.js";
import { getJiraToken, saveJiraToken } from "../../storage/jiraConnectionStore.js";
import { getMeetingById } from "../../storage/meetingsStore.js";
import type { JiraExportResult, JiraOAuthToken, JiraProject, JiraSite } from "../../types/jira.js";

const ATLASSIAN_AUTH_BASE = "https://auth.atlassian.com";
const ATLASSIAN_API_BASE = "https://api.atlassian.com";
const OAUTH_SCOPES = ["offline_access", "read:jira-work", "write:jira-work"];
const TOKEN_REFRESH_WINDOW_MS = 60_000;

class JiraIntegrationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "JiraIntegrationError";
    this.status = status;
  }
}

const requireConfig = () => {
  if (!env.jiraClientId || !env.jiraClientSecret || !env.jiraRedirectUri) {
    throw new JiraIntegrationError(
      "Jira integration is not configured. Set JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, and JIRA_REDIRECT_URI.",
      503,
    );
  }
};

const toBasicAuth = () => {
  requireConfig();
  return Buffer.from(`${env.jiraClientId}:${env.jiraClientSecret}`).toString("base64");
};

const exchangeToken = async (params: Record<string, string>) => {
  const response = await fetch(`${ATLASSIAN_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${toBasicAuth()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new JiraIntegrationError(`Jira token exchange failed: ${body}`, response.status);
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const token: JiraOAuthToken = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    scope: body.scope,
    expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  };
  await saveJiraToken(token);
  return token;
};

const ensureValidToken = async (): Promise<JiraOAuthToken> => {
  const token = await getJiraToken();
  if (!token) {
    throw new JiraIntegrationError("Jira is not connected yet.", 401);
  }

  if (new Date(token.expiresAt).getTime() - Date.now() > TOKEN_REFRESH_WINDOW_MS) {
    return token;
  }

  if (!token.refreshToken) {
    throw new JiraIntegrationError("Jira token expired and no refresh token is available. Reconnect Jira.", 401);
  }

  return exchangeToken({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
    client_id: env.jiraClientId ?? "",
    client_secret: env.jiraClientSecret ?? "",
  });
};

const jiraApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await ensureValidToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new JiraIntegrationError(`Jira API request failed: ${body}`, response.status);
  }

  return (await response.json()) as T;
};

const toAdfDescription = (input: {
  meetingTitle: string;
  ownerEmail: string;
  priority: string;
  dueDate?: string;
  transcript?: string;
}) => ({
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: `Imported from OrbitPlan: ${input.meetingTitle}` }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: `Owner: ${input.ownerEmail}` }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: `Priority: ${input.priority}` }],
    },
    ...(input.dueDate
      ? [
          {
            type: "paragraph",
            content: [{ type: "text", text: `Due date: ${input.dueDate}` }],
          },
        ]
      : []),
    ...(input.transcript
      ? [
          {
            type: "paragraph",
            content: [{ type: "text", text: `Transcript excerpt: ${input.transcript}` }],
          },
        ]
      : []),
  ],
});

export const jiraIntegration = {
  isConfigured() {
    return Boolean(env.jiraClientId && env.jiraClientSecret && env.jiraRedirectUri);
  },

  getAuthorizationUrl() {
    requireConfig();
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: env.jiraClientId ?? "",
      scope: OAUTH_SCOPES.join(" "),
      redirect_uri: env.jiraRedirectUri ?? "",
      state: "orbitplan-jira",
      response_type: "code",
      prompt: "consent",
    });
    return `${ATLASSIAN_AUTH_BASE}/authorize?${params.toString()}`;
  },

  async handleCallback(code: string) {
    requireConfig();
    return exchangeToken({
      grant_type: "authorization_code",
      client_id: env.jiraClientId ?? "",
      client_secret: env.jiraClientSecret ?? "",
      code,
      redirect_uri: env.jiraRedirectUri ?? "",
    });
  },

  async getStatus() {
    return {
      configured: this.isConfigured(),
      connected: Boolean(await getJiraToken()),
    };
  },

  async listSites(): Promise<JiraSite[]> {
    type AccessibleResource = {
      id: string;
      name: string;
      url: string;
      scopes?: string[];
    };

    const resources = await jiraApi<AccessibleResource[]>(`${ATLASSIAN_API_BASE}/oauth/token/accessible-resources`);
    return resources
      .filter((resource) => resource.url && resource.name)
      .map((resource) => ({
        id: resource.id,
        name: resource.name,
        url: resource.url,
      }));
  },

  async listProjects(cloudId: string): Promise<JiraProject[]> {
    const result = await jiraApi<{ values?: Array<{ id: string; key: string; name: string }> }>(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
    );
    return (result.values ?? []).map((project) => ({
      id: project.id,
      key: project.key,
      name: project.name,
    }));
  },

  async exportMeetingActions(input: { meetingId: string; cloudId: string; projectKey: string }): Promise<JiraExportResult> {
    const meeting = await getMeetingById(input.meetingId);
    if (!meeting) {
      throw new JiraIntegrationError("Meeting not found", 404);
    }
    if (!meeting.meeting.actionsConfirmed) {
      throw new JiraIntegrationError("Confirm the action plan before exporting to Jira.", 409);
    }

    const issues: JiraExportResult["issues"] = [];

    for (const action of meeting.actions) {
      const createIssue = async (withPriority: boolean) =>
        jiraApi<{ key: string }>(`https://api.atlassian.com/ex/jira/${input.cloudId}/rest/api/3/issue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              project: { key: input.projectKey },
              summary: action.description,
              issuetype: { name: "Task" },
              description: toAdfDescription({
                meetingTitle: meeting.meeting.title,
                ownerEmail: action.ownerEmail,
                priority: action.priority,
                dueDate: action.dueDate,
                transcript: meeting.transcript?.text.slice(0, 200),
              }),
              ...(action.dueDate ? { duedate: action.dueDate } : {}),
              ...(withPriority
                ? {
                    priority: {
                      name: action.priority === "high" ? "High" : action.priority === "low" ? "Low" : "Medium",
                    },
                  }
                : {}),
            },
          }),
        });

      let created;
      try {
        created = await createIssue(true);
      } catch (error) {
        if (!(error instanceof JiraIntegrationError) || error.status < 400 || error.status >= 500) {
          throw error;
        }
        created = await createIssue(false);
      }

      issues.push({
        actionId: action.id,
        key: created.key,
        url: `${(await this.listSites()).find((site) => site.id === input.cloudId)?.url ?? ""}/browse/${created.key}`,
      });
    }

    return {
      createdCount: issues.length,
      issues,
    };
  },
};

export { JiraIntegrationError };
