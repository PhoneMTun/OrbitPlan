import type { Request, Response } from "express";
import { z } from "zod";
import { JiraIntegrationError, jiraIntegration } from "../services/integrations/jira.js";

const JiraExportSchema = z.object({
  meetingId: z.string().uuid(),
  cloudId: z.string().min(1),
  projectKey: z.string().min(1),
  ticketFormatPreset: z.enum(["enterprise", "engineering", "operations", "compliance"]).optional(),
  ticketDetails: z
    .object({
      issueType: z.string().min(1).optional(),
      labels: z.array(z.string().min(1)).optional(),
      components: z.array(z.string().min(1)).optional(),
      environment: z.string().optional(),
      additionalContext: z.string().optional(),
      advancedFields: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

const handleJiraError = (res: Response, error: unknown) => {
  if (error instanceof JiraIntegrationError) {
    return res.status(error.status).json({ error: error.message });
  }
  return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown Jira integration error" });
};

export const getJiraStatusHandler = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(await jiraIntegration.getStatus());
  } catch (error) {
    return handleJiraError(res, error);
  }
};

export const getJiraAuthUrlHandler = (_req: Request, res: Response) => {
  try {
    return res.status(200).json({ url: jiraIntegration.getAuthorizationUrl() });
  } catch (error) {
    return handleJiraError(res, error);
  }
};

export const jiraCallbackHandler = async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (!code) {
    return res.status(400).send("Missing Jira OAuth code.");
  }

  try {
    await jiraIntegration.handleCallback(code);
    return res
      .status(200)
      .type("html")
      .send(`<!doctype html>
<html>
  <body style="font-family:sans-serif;background:#0b1024;color:#fff;padding:24px">
    Jira connected. You can return to OrbitPlan.
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: "orbitplan:jira-connected" }, "*");
      }
      setTimeout(function () { window.close(); }, 1200);
    </script>
  </body>
</html>`);
  } catch (error) {
    return handleJiraError(res, error);
  }
};

export const listJiraSitesHandler = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({ sites: await jiraIntegration.listSites() });
  } catch (error) {
    return handleJiraError(res, error);
  }
};

export const listJiraProjectsHandler = async (req: Request, res: Response) => {
  const cloudId = typeof req.query.cloudId === "string" ? req.query.cloudId : undefined;
  if (!cloudId) {
    return res.status(400).json({ error: "cloudId is required" });
  }

  try {
    return res.status(200).json({ projects: await jiraIntegration.listProjects(cloudId) });
  } catch (error) {
    return handleJiraError(res, error);
  }
};

export const exportMeetingToJiraHandler = async (req: Request, res: Response) => {
  const parsed = JiraExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    return res.status(200).json(await jiraIntegration.exportMeetingActions(parsed.data));
  } catch (error) {
    return handleJiraError(res, error);
  }
};
