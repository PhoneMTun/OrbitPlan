import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export type ProcessWebhookPayload = {
  meetingId: string;
  status: "ready" | "error";
  error?: string;
};

export const notifyMeetingProcessWebhook = async (payload: ProcessWebhookPayload): Promise<void> => {
  const url = env.processWebhookUrl?.trim();
  if (!url) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "OrbitPlan-API/1.0",
  };
  if (env.processWebhookSecret) {
    headers.Authorization = `Bearer ${env.processWebhookSecret}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn("process.webhook.http_error", {
        meetingId: payload.meetingId,
        status: res.status,
        webhookStatus: payload.status,
      });
    }
  } catch (e) {
    logger.warn("process.webhook.failed", {
      meetingId: payload.meetingId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
