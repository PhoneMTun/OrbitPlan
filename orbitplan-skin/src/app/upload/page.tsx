"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { MovingBorderLink } from "@/components/aceternity/moving-border-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/aceternity/file-upload";
import { OrbitLoader } from "@/components/marketing/orbit-loader";
import { ApiRequestError, createMeeting, getProcessingErrorMessage, processMeeting, uploadMeetingFile } from "@/lib/api";
import { MeetingCreateSchema } from "@/dto/meetings";

const SUPPORTED_EXTENSIONS = new Set(["mp3", "wav", "m4a", "mp4", "webm"]);

export default function UploadPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingProcess, setIsRetryingProcess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const attendeeList = useMemo(
    () =>
      attendees
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [attendees],
  );

  const handleSubmit = async () => {
    setError(null);
    setReviewId(null);

    if (!file) {
      setError("Please choose an audio or video file.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      setError("Unsupported file format. Please upload MP3, WAV, M4A, MP4, or WEBM.");
      return;
    }

    const payload = {
      title,
      attendees: attendeeList,
      source: "upload" as const,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
    };

    const parsed = MeetingCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Invalid form fields. Check title and attendee emails.");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createMeeting(parsed.data);
      setCreatedMeetingId(created.id);
      await uploadMeetingFile(created.id, file);
      await processMeeting(created.id);
      setReviewId(created.id);
    } catch (submitError) {
      if (submitError instanceof ApiRequestError && submitError.status === 401) {
        await refresh();
        setError("Your session expired after login/logout. Please sign in again and retry the upload.");
        router.replace("/login?next=%2Fupload");
        return;
      }
      setError(getProcessingErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryProcessing = async () => {
    if (!createdMeetingId) return;
    setError(null);
    setIsRetryingProcess(true);
    try {
      await processMeeting(createdMeetingId);
      setReviewId(createdMeetingId);
    } catch (retryError) {
      if (retryError instanceof ApiRequestError && retryError.status === 401) {
        await refresh();
        setError("Your session expired after login/logout. Please sign in again and retry processing.");
        router.replace("/login?next=%2Fupload");
        return;
      }
      setError(getProcessingErrorMessage(retryError));
    } finally {
      setIsRetryingProcess(false);
    }
  };

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur-md fade-in">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Intake Console</p>
          <h2 className="mt-1 text-2xl font-bold">Create Meeting Mission</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Create metadata, upload media, then start processing (async on the server). The app polls until your plan is ready.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title="Meeting Payload" subtitle="All fields validated before API call.">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Meeting Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Weekly Ops Sync"
              />
              <Input
                label="Schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>

            <div className="mt-4 grid gap-4">
              <Input
                label="Attendees"
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
                placeholder="alice@team.com, bob@team.com"
                hint="Comma-separated email list"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">Meeting File</p>
                <FileUpload selectedFile={file} onFileSelect={setFile} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={handleSubmit} disabled={isSubmitting} className={isSubmitting ? "glow-pulse" : ""}>
                {isSubmitting ? "Processing..." : "Create + Upload + Process"}
              </Button>
              {isSubmitting && <OrbitLoader label="Orbiting through transcription + analysis..." />}
              {reviewId && (
                <MovingBorderLink href={`/review/${reviewId}`}>Open Review</MovingBorderLink>
              )}
              {!reviewId && createdMeetingId && !isSubmitting && (
                <Button variant="secondary" onClick={handleRetryProcessing} disabled={isRetryingProcess}>
                  {isRetryingProcess ? "Retrying..." : "Retry Processing"}
                </Button>
              )}
            </div>

            {error && <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p>}
          </Card>

          <Card title="Execution Sequence" subtitle="Current API calls">
            <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>1. `POST /api/meetings`</li>
              <li>2. `POST /api/meetings/:id/upload`</li>
              <li>3. `POST /api/meetings/:id/process` → 202 + poll `GET` until `ready`</li>
            </ol>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
