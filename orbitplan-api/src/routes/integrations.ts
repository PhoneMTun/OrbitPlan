import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  exportMeetingToJiraHandler,
  getJiraAuthUrlHandler,
  getJiraStatusHandler,
  jiraCallbackHandler,
  listJiraProjectsHandler,
  listJiraSitesHandler,
} from "../controllers/integrations.js";

const router = Router();

router.get("/integrations/jira/callback", jiraCallbackHandler);
router.use(requireAuth);
router.get("/integrations/jira/status", getJiraStatusHandler);
router.get("/integrations/jira/auth-url", getJiraAuthUrlHandler);
router.get("/integrations/jira/sites", listJiraSitesHandler);
router.get("/integrations/jira/projects", listJiraProjectsHandler);
router.post("/integrations/jira/export", exportMeetingToJiraHandler);

export default router;
