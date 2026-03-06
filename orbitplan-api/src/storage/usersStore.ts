import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types/auth.js";

const SALT_ROUNDS = 10;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapUser = (user: { id: string; email: string; role: "admin" }): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

export const hashPassword = async (password: string) => bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = async (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

export const getUserByEmail = async (email: string) =>
  prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

export const ensureAdminUser = async (email: string, password: string): Promise<AuthUser> => {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    const passwordMatches = await verifyPassword(password, existingUser.passwordHash);
    if (passwordMatches && existingUser.role === "admin") {
      return mapUser(existingUser);
    }

    const passwordHash = await hashPassword(password);
    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        passwordHash,
        role: "admin",
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return mapUser(updatedUser);
  }

  const passwordHash = await hashPassword(password);
  const createdUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return mapUser(createdUser);
};
