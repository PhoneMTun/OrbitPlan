import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { getAuthSessionById } from "../storage/authSessionsStore.js";
import type { AuthSession } from "../types/auth.js";

const SESSION_COOKIE_NAME = "orbitplan_session";

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return new Map<string, string>();
  return new Map(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...value] = item.split("=");
        return [key, decodeURIComponent(value.join("="))] as const;
      }),
  );
};

const signSessionId = (sessionId: string) =>
  crypto.createHmac("sha256", env.sessionSecret).update(sessionId).digest("hex");

const verifySignedCookie = (rawValue?: string) => {
  if (!rawValue) return null;
  const [sessionId, signature] = rawValue.split(".");
  if (!sessionId || !signature) return null;
  const expected = signSessionId(sessionId);
  if (signature.length !== expected.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return valid ? sessionId : null;
};

const buildCookieValue = (sessionId: string) => `${sessionId}.${signSessionId(sessionId)}`;

export const setSessionCookie = (res: Response, sessionId: string, maxAgeMs: number) => {
  res.cookie(SESSION_COOKIE_NAME, buildCookieValue(sessionId), {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  });
};

export const getRequestSession = async (req: Request): Promise<AuthSession | null> => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = verifySignedCookie(cookies.get(SESSION_COOKIE_NAME));
  if (!sessionId) return null;
  return await getAuthSessionById(sessionId);
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const session = await getRequestSession(req);
  if (!session) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.authSession = session;
  return next();
};
