import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  approveMeetingHandler,
  chatMeetingHandler,
  clearMeetingChatHistoryHandler,
  confirmMeetingActionsHandler,
  createMeetingHandler,
  deleteMeetingActionHandler,
  getMeetingHandler,
  listMeetingChatHistoryHandler,
  processMeetingHandler,
  updateMeetingActionHandler,
  uploadMeetingFileHandler,
} from "../controllers/meetings.js";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 200 },
});

router.post("/meetings", createMeetingHandler);
router.get("/meetings/:id", getMeetingHandler);
router.post("/meetings/:id/upload", upload.single("file"), uploadMeetingFileHandler);
router.post("/meetings/:id/process", processMeetingHandler);
router.post("/meetings/:id/approve", approveMeetingHandler);
router.post("/meetings/:id/actions/confirm", confirmMeetingActionsHandler);
router.patch("/meetings/:id/actions/:actionId", updateMeetingActionHandler);
router.delete("/meetings/:id/actions/:actionId", deleteMeetingActionHandler);
router.post("/meetings/:id/chat", chatMeetingHandler);
router.get("/meetings/:id/chat", listMeetingChatHistoryHandler);
router.delete("/meetings/:id/chat", clearMeetingChatHistoryHandler);

export default router;
