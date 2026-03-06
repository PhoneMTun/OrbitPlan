import type { AuthSession } from "./auth.js";

declare module "express-serve-static-core" {
  interface Request {
    authSession?: AuthSession | null;
  }
}
