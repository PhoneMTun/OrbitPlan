# OrbitPlan API

## Setup

```bash
cd /Users/phonemyat/Documents/New project/orbitplan-api
cp .env.example .env
npm install
npm run dev
```

## Postgres + Prisma

OrbitPlan API runtime now uses PostgreSQL + Prisma for auth sessions, meetings, actions, transcripts, summaries, chat history, email logs, and Jira OAuth storage.

### Local database

Use Docker:

```bash
cd /Users/phonemyat/Documents/New project/orbitplan-api
open -a Docker
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

```bash
curl -X POST http://localhost:4000/api/meetings/123/process
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
