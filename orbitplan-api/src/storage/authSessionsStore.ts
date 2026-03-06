import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { AuthSession, AuthUser } from "../types/auth.js";

const SESSION_SELECT = {
  id: true,
  expiresAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
} as const;

const toAuthSession = (session: {
  id: string;
  expiresAt: Date;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    role: "admin";
  };
}): AuthSession => ({
  id: session.id,
  user: session.user,
  expiresAt: session.expiresAt.toISOString(),
  createdAt: session.createdAt.toISOString(),
});

export const purgeExpiredSessions = async () => {
  await prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });
};

export const createAuthSession = async (user: AuthUser, ttlMs: number) => {
  await purgeExpiredSessions();

  const session = await prisma.authSession.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + ttlMs),
    },
    select: SESSION_SELECT,
  });

  return toAuthSession(session);
};

export const getAuthSessionById = async (sessionId: string) => {
  await purgeExpiredSessions();
  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: SESSION_SELECT,
  });
  return session ? toAuthSession(session) : null;
};

export const deleteAuthSession = async (sessionId: string) => {
  const deleted = await prisma.authSession.deleteMany({
    where: { id: sessionId },
  });
  return deleted.count > 0;
};
