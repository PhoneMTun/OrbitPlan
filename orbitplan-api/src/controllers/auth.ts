import crypto from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { clearSessionCookie, getRequestSession, setSessionCookie } from "../middleware/auth.js";
import { createAuthSession, deleteAuthSession } from "../storage/authSessionsStore.js";
import { ensureAdminUser, getUserByEmail, verifyPassword } from "../storage/usersStore.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const requireGoogleConfig = () => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new Error("Google auth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.");
  }
};

const createGoogleState = () => {
  const payload = `${Date.now()}:${crypto.randomUUID()}`;
  const signature = crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
};

const verifyGoogleState = (value?: string) => {
  if (!value) return false;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [timestamp, nonce, signature] = decoded.split(":");
    if (!timestamp || !nonce || !signature) return false;
    if (Date.now() - Number(timestamp) > 10 * 60 * 1000) return false;
    const expected = crypto.createHmac("sha256", env.sessionSecret).update(`${timestamp}:${nonce}`).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const requestedEmail = parsed.data.email.trim().toLowerCase();
  const adminEmail = env.adminEmail.trim().toLowerCase();
  if (requestedEmail !== adminEmail) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await ensureAdminUser(env.adminEmail, env.adminPassword);
  const user = await getUserByEmail(requestedEmail);
  if (!user) {
    return res.status(500).json({ error: "Admin user bootstrap failed" });
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = await createAuthSession(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    SESSION_TTL_MS,
  );

  setSessionCookie(res, session.id, SESSION_TTL_MS);
  return res.status(200).json({ user: session.user });
};

export const logoutHandler = (req: Request, res: Response) => {
  const run = async () => {
    const session = await getRequestSession(req);
    if (session) {
      await deleteAuthSession(session.id);
    }
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  };

  return run();
};

export const meHandler = (req: Request, res: Response) => {
  const run = async () => {
    const session = await getRequestSession(req);
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.status(200).json({ user: session.user });
  };

  return run();
};

export const googleAuthUrlHandler = (_req: Request, res: Response) => {
  try {
    requireGoogleConfig();
    const params = new URLSearchParams({
      client_id: env.googleClientId ?? "",
      redirect_uri: env.googleRedirectUri ?? "",
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state: createGoogleState(),
    });
    return res.status(200).json({ url: `${GOOGLE_AUTH_BASE}?${params.toString()}` });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : "Google auth unavailable" });
  }
};

export const googleCallbackHandler = async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !verifyGoogleState(state)) {
    return res.status(400).send("Invalid Google OAuth callback.");
  }

  try {
    requireGoogleConfig();

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId ?? "",
        client_secret: env.googleClientSecret ?? "",
        redirect_uri: env.googleRedirectUri ?? "",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      return res.status(502).send(`Google token exchange failed: ${details}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      const details = await userResponse.text();
      return res.status(502).send(`Google user lookup failed: ${details}`);
    }

    const googleUser = (await userResponse.json()) as { email?: string; email_verified?: boolean };
    if (!googleUser.email || !googleUser.email_verified) {
      return res.status(403).send("Google account email is missing or unverified.");
    }

    const googleEmail = googleUser.email.trim().toLowerCase();
    const adminEmail = env.adminEmail.trim().toLowerCase();
    if (googleEmail !== adminEmail) {
      return res.status(403).send("This Google account is not authorized for OrbitPlan admin access.");
    }

    const adminUser = await ensureAdminUser(env.adminEmail, env.adminPassword);
    const session = await createAuthSession(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
      SESSION_TTL_MS,
    );
    setSessionCookie(res, session.id, SESSION_TTL_MS);

    return res
      .status(200)
      .type("html")
      .send(`<!doctype html>
<html>
  <body style="font-family:sans-serif;background:#0b1024;color:#fff;padding:24px">
    Google login connected. You can return to OrbitPlan.
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: "orbitplan:google-connected" }, "*");
      }
      setTimeout(function () { window.close(); }, 1200);
    </script>
  </body>
</html>`);
  } catch (error) {
    return res.status(500).send(error instanceof Error ? error.message : "Google authentication failed.");
  }
};
