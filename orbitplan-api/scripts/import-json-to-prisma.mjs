import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const meetingsPath = path.resolve(process.cwd(), "data", "meetings.json");
const sessionsPath = path.resolve(process.cwd(), "data", "sessions.json");

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const sanitizeText = (value) =>
  String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "");

const main = async () => {
  const meetingsData = readJson(meetingsPath, {
    meetings: [],
    files: [],
    transcripts: [],
    summaries: [],
    actions: [],
    emailLogs: [],
    chatMessages: [],
  });
  const sessionsData = readJson(sessionsPath, { sessions: [] });

  await prisma.meetingChatMessage.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.meetingSummary.deleteMany();
  await prisma.meetingTranscript.deleteMany();
  await prisma.meetingFile.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.authSession.deleteMany();

  for (const meeting of meetingsData.meetings ?? []) {
    await prisma.meeting.create({
      data: {
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt ? new Date(meeting.scheduledAt) : null,
        attendees: meeting.attendees ?? [],
        source: meeting.source,
        status: meeting.status,
        actionsConfirmed: typeof meeting.actionsConfirmed === "boolean" ? meeting.actionsConfirmed : true,
        createdAt: new Date(meeting.createdAt),
      },
    });
  }

  for (const file of meetingsData.files ?? []) {
    await prisma.meetingFile.create({
      data: {
        id: file.id,
        meetingId: file.meetingId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        createdAt: new Date(file.createdAt),
      },
    });
  }

  for (const transcript of meetingsData.transcripts ?? []) {
    await prisma.meetingTranscript.create({
      data: {
        id: transcript.id,
        meetingId: transcript.meetingId,
        text: sanitizeText(transcript.text),
        createdAt: new Date(transcript.createdAt),
      },
    });
  }

  for (const summary of meetingsData.summaries ?? []) {
    await prisma.meetingSummary.create({
      data: {
        id: summary.id,
        meetingId: summary.meetingId,
        decisions: sanitizeText(summary.decisions),
        risks: sanitizeText(summary.risks),
        notes: sanitizeText(summary.notes),
        createdAt: new Date(summary.createdAt),
      },
    });
  }

  for (const action of meetingsData.actions ?? []) {
    await prisma.actionItem.create({
      data: {
        id: action.id,
        meetingId: action.meetingId,
        ownerEmail: action.ownerEmail,
        dueDate: action.dueDate ?? null,
        description: sanitizeText(action.description),
        confidence: action.confidence,
        status: action.status === "blocked" ? "in_progress" : action.status,
        priority: action.priority ?? "medium",
        createdAt: new Date(action.createdAt),
      },
    });
  }

  for (const log of meetingsData.emailLogs ?? []) {
    await prisma.emailLog.create({
      data: {
        id: log.id,
        meetingId: log.meetingId,
        recipient: log.recipient,
        type: log.type,
        payload: log.payload ?? {},
        sentAt: new Date(log.sentAt),
      },
    });
  }

  for (const message of meetingsData.chatMessages ?? []) {
    await prisma.meetingChatMessage.create({
      data: {
        id: message.id,
        meetingId: message.meetingId,
        role: message.role,
        text: sanitizeText(message.text),
        citations: (message.citations ?? []).map((item) => sanitizeText(item)),
        createdAt: new Date(message.createdAt),
      },
    });
  }

  for (const session of sessionsData.sessions ?? []) {
    await prisma.authSession.create({
      data: {
        id: session.id,
        userEmail: session.user.email,
        role: session.user.role,
        expiresAt: new Date(session.expiresAt),
        createdAt: new Date(session.createdAt),
      },
    });
  }

  console.log("Imported JSON data into Postgres via Prisma.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
