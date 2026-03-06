export type AuthRole = "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
};

export type AuthSession = {
  id: string;
  user: AuthUser;
  expiresAt: string;
  createdAt: string;
};
