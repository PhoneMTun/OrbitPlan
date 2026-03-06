import { Router } from "express";
import { googleAuthUrlHandler, googleCallbackHandler, loginHandler, logoutHandler, meHandler } from "../controllers/auth.js";

const router = Router();

router.post("/auth/login", loginHandler);
router.post("/auth/logout", logoutHandler);
router.get("/auth/me", meHandler);
router.get("/auth/google/url", googleAuthUrlHandler);
router.get("/auth/google/callback", googleCallbackHandler);

export default router;
