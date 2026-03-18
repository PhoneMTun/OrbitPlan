# OrbitPlan API

Express + Prisma API: **upload → transcribe → analyze** (decisions, risks, notes, actions) → persist; plus meeting chat and Jira.

## Setup

From the monorepo root:

```bash
cd orbitplan-api
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Or absolute path:

```bash
cd "/path/to/orbitplan/orbitplan-api"
```

## Postgres + Prisma

OrbitPlan API runtime now uses PostgreSQL + Prisma for auth sessions, meetings, actions, transcripts, summaries, chat history, email logs, and Jira OAuth storage.

### Local database

Use Docker:

```bash
cd orbitplan-api
open -a Docker   # macOS
npm run db:up
```

Set this in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbitplan?schema=public
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run the first migration:

```bash
npm run prisma:migrate -- --name init
```

Import legacy JSON data into Postgres one time:

```bash
npm run db:import-json
```

If you only want to sync schema without creating a migration:

```bash
npm run prisma:push
```

## Transcription Provider

- `TRANSCRIPTION_PROVIDER=mock` uses local mock text extraction (no API key).
- `TRANSCRIPTION_PROVIDER=openai` uses OpenAI speech-to-text and requires `OPENAI_API_KEY`.
- `ANALYSIS_PROVIDER=mock` uses deterministic local extraction of decisions/risks/actions.
- `ANALYSIS_PROVIDER=openai` uses OpenAI to extract structured summary + actions.
- `CHAT_PROVIDER=mock` answers meeting questions from local heuristics.
- `CHAT_PROVIDER=openai` answers questions grounded on transcript + summary + actions.
- `AI_TIMEOUT_MS` controls OpenAI request timeout (default `180000`).
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error` for structured JSON logs (default: debug in development, info in production).

## Architecture (where to look)

| Area | Path |
|------|------|
| HTTP app + `/health` | `src/app.ts` |
| Meeting routes | `src/routes/meetings.ts` |
| Process pipeline (transcribe → analyze → DB) | `src/controllers/meetings.ts` → `processMeeting` in `src/storage/meetingsStore.ts` |
| Transcription / analysis / chat providers | `src/services/transcription`, `src/services/analysis`, `src/services/chat` |
| **Editable AI prompts** | `src/prompts/meetingAnalysis.ts`, `src/prompts/meetingChat.ts` |
| Process observability | JSON logs: `meeting.process.*` events (see `src/lib/logger.ts`) |

## Health Check

```bash
curl http://localhost:4000/health
```

Expected healthy response:

```json
{"status":"ok","database":"up"}
```

## Create Meeting

```bash
curl -X POST http://localhost:4000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{"title":"Weekly Ops","scheduledAt":"2026-02-09T10:00:00Z","attendees":["owner@company.com"],"source":"upload"}'
```

## Upload Audio/Video

```bash
curl -X POST http://localhost:4000/api/meetings/123/upload \
  -F "file=@/path/to/meeting.mp3"
```

## Process Meeting (Transcription + Summary Draft)

**Default (async):** returns **202** immediately and runs transcription + analysis in the background.

```bash
curl -i -X POST http://localhost:4000/api/meetings/123/process \
  -H "Cookie: orbitplan_session=..."
```

Response body example:

```json
{
  "accepted": true,
  "status": "processing",
  "meetingId": "…",
  "pollUrl": "/api/meetings/…",
  "message": "Processing started. Poll GET …"
}
```

Poll until `GET /api/meetings/:id` shows `"status": "ready"` or `"error"`. On error, `processingError` explains what went wrong.

**Optional webhook** when processing finishes: set `PROCESS_WEBHOOK_URL` (and optional `PROCESS_WEBHOOK_SECRET` for `Authorization: Bearer …`). Payload:

```json
{ "meetingId": "uuid", "status": "ready" }
```

or `{ "meetingId": "uuid", "status": "error", "error": "…" }`.

**Blocking (same as before):** add `?wait=true` (long request; use for scripts only).

```bash
curl -X POST "http://localhost:4000/api/meetings/123/process?wait=true"
```

## Approve Meeting (Logs outbound email intents)

```bash
curl -X POST http://localhost:4000/api/meetings/123/approve
```

## Meeting Chat (Q&A on meeting context)

```bash
curl -X POST http://localhost:4000/api/meetings/123/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Who owns the top action item?"}'
```
