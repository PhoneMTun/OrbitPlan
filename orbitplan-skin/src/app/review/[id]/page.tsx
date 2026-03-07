"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { AnimatePresence, motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { Tabs } from "@/components/aceternity/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  approveMeeting,
  askMeetingQuestion,
  clearMeetingChatHistory,
  confirmMeetingActions,
  deleteMeetingAction,
  exportMeetingToJira,
  getMeeting,
  getMeetingChatHistory,
  getJiraAuthUrl,
  getJiraProjects,
  getJiraSites,
  getJiraStatus,
  getProcessingErrorMessage,
  processMeeting,
  updateMeetingAction,
} from "@/lib/api";
import type { ActionPriority, ActionStatus } from "@/types/action";
import type { ChatMessage } from "@/types/chat";
import type { JiraExportResult, JiraIntegrationStatus, JiraProject, JiraSite } from "@/types/jira";
import type { MeetingDetail } from "@/types/meetingDetail";

const statusTone = (status: string): "neutral" | "success" | "warning" => {
  if (status === "approved") return "success";
  if (status === "ready") return "warning";
  return "neutral";
};

type WorkspaceTab = "summary" | "chat";
type DownloadFormat = "txt" | "csv" | "pdf" | "docx";
type TicketFormatPreset = "enterprise" | "engineering" | "operations" | "compliance";
type SettingsPanelTab = "export-target" | "project" | "formats" | "fields" | "automation";
type JiraTicketDetailsDraft = {
  issueType: string;
  labelsText: string;
  componentsText: string;
  environment: string;
  additionalContext: string;
  advancedFieldsJson: string;
};
const CHAT_PAGE_SIZE = 20;

const TICKET_FORMAT_PRESETS: Array<{
  id: TicketFormatPreset;
  label: string;
  description: string;
  sections: string[];
}> = [
  {
    id: "enterprise",
    label: "Enterprise Standard",
    description: "Balanced ticket structure for cross-functional teams with clear outcomes, ownership, and acceptance criteria.",
    sections: ["Business outcome", "Scope", "Owner", "Acceptance criteria"],
  },
  {
    id: "engineering",
    label: "Engineering Delivery",
    description: "Technical format for product and engineering teams with implementation notes, dependencies, and QA detail.",
    sections: ["Implementation notes", "Dependencies", "QA checklist", "Release notes"],
  },
  {
    id: "operations",
    label: "Operations Handoff",
    description: "Operational template focused on impact, urgency, support context, and execution readiness.",
    sections: ["Operational impact", "Priority", "Runbook notes", "Stakeholders"],
  },
  {
    id: "compliance",
    label: "Compliance Audit",
    description: "Controlled format for regulated workflows with approvals, evidence, risk statements, and rollback planning.",
    sections: ["Control objective", "Risk", "Evidence", "Approval trail"],
  },
];

const DEFAULT_JIRA_TICKET_DETAILS: JiraTicketDetailsDraft = {
  issueType: "Task",
  labelsText: "orbitplan",
  componentsText: "",
  environment: "",
  additionalContext: "",
  advancedFieldsJson: "",
};

const ACTION_STATUS_OPTIONS: Array<{ value: ActionStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const ACTION_PRIORITY_OPTIONS: Array<{ value: ActionPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const statusBadgeClass: Record<ActionStatus, string> = {
  open: "border-[rgba(255,213,106,0.45)] bg-[rgba(255,213,106,0.16)] text-[var(--warning)]",
  in_progress: "border-[rgba(108,242,255,0.45)] bg-[rgba(108,242,255,0.15)] text-[var(--accent)]",
  done: "border-[rgba(56,255,179,0.45)] bg-[rgba(56,255,179,0.15)] text-[var(--success)]",
};

const priorityBadgeClass: Record<ActionPriority, string> = {
  low: "border-[rgba(108,242,255,0.35)] bg-[rgba(108,242,255,0.13)] text-[var(--accent)]",
  medium: "border-[rgba(255,213,106,0.4)] bg-[rgba(255,213,106,0.16)] text-[var(--warning)]",
  high: "border-[rgba(255,107,122,0.45)] bg-[rgba(255,107,122,0.15)] text-[var(--danger)]",
};

type PlatformSyncState = "connected" | "available" | "not_connected";
type ReviewSidebarTool =
  | "integrations"
  | "approval"
  | "transcript"
  | "summary"
  | "chat"
  | "tickets"
  | "people"
  | "files"
  | "timeline"
  | "notifications"
  | "settings";

const platformStateMeta: Record<
  PlatformSyncState,
  { label: string; tone: "neutral" | "success" | "warning"; description: string }
> = {
  connected: {
    label: "Connected",
    tone: "success",
    description: "Your account is synced and ready to create tickets.",
  },
  available: {
    label: "Available",
    tone: "warning",
    description: "Integration support exists, but this account is not connected yet.",
  },
  not_connected: {
    label: "Not Connected",
    tone: "neutral",
    description: "This platform is not linked for ticket sync yet.",
  },
};

function ChatTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="mr-auto flex max-w-[92%] items-end gap-2"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(143,56,255,0.42)] bg-[rgba(143,56,255,0.22)] text-[10px] font-bold text-[var(--text-primary)]">
        OP
      </div>
      <div className="rounded-2xl border border-[rgba(143,56,255,0.35)] bg-[rgba(143,56,255,0.15)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="loader-pulse-dot" />
          <span className="loader-pulse-dot" />
          <span className="loader-pulse-dot" />
        </div>
      </div>
    </motion.div>
  );
}

function ChatConversationBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const timestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex max-w-[92%] items-end gap-2 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold ${
          isUser
            ? "border-[rgba(30,123,255,0.42)] bg-[rgba(30,123,255,0.22)] text-[var(--text-primary)]"
            : "border-[rgba(143,56,255,0.42)] bg-[rgba(143,56,255,0.22)] text-[var(--text-primary)]"
        }`}
      >
        {isUser ? "YOU" : "OP"}
      </div>

      <div
        className={`rounded-2xl border px-3 py-2 text-sm ${
          isUser
            ? "border-[rgba(30,123,255,0.35)] bg-[rgba(30,123,255,0.18)] text-[var(--text-primary)]"
            : "border-[rgba(143,56,255,0.35)] bg-[rgba(143,56,255,0.15)] text-[var(--text-secondary)]"
        }`}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
          {isUser ? "You" : "OrbitBot"}
        </p>
        <p className="whitespace-pre-wrap">{message.text}</p>
        {timestamp && <p className="mt-2 text-[10px] text-[var(--text-muted)]">{timestamp}</p>}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-xs">
            {message.citations.map((citation, idx) => (
              <p key={`${message.id}-c-${idx}`}>- {citation}</p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [retryingProcess, setRetryingProcess] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatCursor, setChatCursor] = useState<string | null>(null);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatClearing, setChatClearing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [confirmingActions, setConfirmingActions] = useState<"accept" | "fallback" | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [jiraStatus, setJiraStatus] = useState<JiraIntegrationStatus | null>(null);
  const [jiraSites, setJiraSites] = useState<JiraSite[]>([]);
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraCloudId, setJiraCloudId] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraExporting, setJiraExporting] = useState(false);
  const [jiraResult, setJiraResult] = useState<JiraExportResult | null>(null);
  const [jiraConnectedNotice, setJiraConnectedNotice] = useState(false);
  const [activeSidebarTool, setActiveSidebarTool] = useState<ReviewSidebarTool | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("summary");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("txt");
  const [ticketFormatPreset, setTicketFormatPreset] = useState<TicketFormatPreset>("enterprise");
  const [settingsPanelTab, setSettingsPanelTab] = useState<SettingsPanelTab>("formats");
  const [jiraTicketDetails, setJiraTicketDetails] = useState<JiraTicketDetailsDraft>(DEFAULT_JIRA_TICKET_DETAILS);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const hasSeededChatRef = useRef(false);
  const selectedTicketFormat =
    TICKET_FORMAT_PRESETS.find((preset) => preset.id === ticketFormatPreset) ?? TICKET_FORMAT_PRESETS[0];
  const jiraLabels = jiraTicketDetails.labelsText
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
  const jiraComponents = jiraTicketDetails.componentsText
    .split(",")
    .map((component) => component.trim())
    .filter(Boolean);
  const platformSyncItems = [
    {
      name: "Jira",
      state: !jiraStatus?.configured ? ("not_connected" as const) : jiraStatus.connected ? ("connected" as const) : ("available" as const),
      detail: !jiraStatus?.configured
        ? "Set Jira OAuth in the API first."
        : jiraStatus.connected
          ? `${jiraSites.length} workspace${jiraSites.length === 1 ? "" : "s"} available for export.`
          : "Connect Jira to push approved actions into a project.",
    },
    {
      name: "Linear",
      state: "not_connected" as const,
      detail: "Not wired into this workspace yet.",
    },
    {
      name: "Asana",
      state: "not_connected" as const,
      detail: "Not wired into this workspace yet.",
    },
    {
      name: "Trello",
      state: "not_connected" as const,
      detail: "Not wired into this workspace yet.",
    },
  ];

  const renderExecutionPanel = () => {
    if (!data) return null;

    return (
      <div className="space-y-6">
        {(!data.transcript?.text || data.meeting.status === "created" || data.meeting.status === "processing") && (
          <Card title="Processing Status" subtitle="Retry if AI processing failed or timed out">
            <Button variant="secondary" onClick={handleRetryProcessing} disabled={retryingProcess}>
              {retryingProcess ? "Retrying..." : "Retry Processing"}
            </Button>
          </Card>
        )}

        <Card title="Actions">
          <div className="space-y-3">
            {!data.meeting.actionsConfirmed && (
              <div className="rounded-xl border border-[rgba(108,242,255,0.35)] bg-[rgba(108,242,255,0.12)] p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Confirm Proposed Action Plan</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Review the generated action list. Confirm to keep it, or use fallback to replace with a safe default task.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void handleConfirmActions(true)}
                    disabled={Boolean(confirmingActions)}
                  >
                    {confirmingActions === "accept" ? "Confirming..." : "Confirm List"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void handleConfirmActions(false)}
                    disabled={Boolean(confirmingActions)}
                  >
                    {confirmingActions === "fallback" ? "Applying..." : "Use Fallback"}
                  </Button>
                </div>
              </div>
            )}
            {data.actions.length === 0 && <p className="text-sm text-[var(--text-muted)]">No actions generated yet.</p>}
            {data.actions.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[rgba(255,213,106,0.34)] bg-[rgba(255,213,106,0.1)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">Open</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {data.actions.filter((item) => item.status === "open").length}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(108,242,255,0.34)] bg-[rgba(108,242,255,0.1)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">In Progress</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {data.actions.filter((item) => item.status === "in_progress").length}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(56,255,179,0.34)] bg-[rgba(56,255,179,0.1)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--success)]">Done</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {data.actions.filter((item) => item.status === "done").length}
                  </p>
                </div>
              </div>
            )}
            {data.actions.map((action, index) => (
              <motion.article
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-[rgba(120,145,255,0.32)] bg-[linear-gradient(135deg,rgba(30,123,255,0.18)_0%,rgba(143,56,255,0.14)_55%,rgba(255,180,0,0.08)_100%)] p-3"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent-warm)]" />
                <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[rgba(30,123,255,0.2)] blur-2xl transition group-hover:bg-[rgba(143,56,255,0.24)]" />

                <div className="ml-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-[rgba(120,145,255,0.45)] bg-[rgba(7,12,30,0.8)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      Task {index + 1}
                    </span>
                    <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)]">
                      {Math.round(action.confidence * 100)}% confidence
                    </span>
                  </div>

                  <p className="text-sm font-semibold leading-relaxed text-[var(--text-primary)]">{action.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Owner: <span className="font-semibold text-[var(--text-primary)]">{action.ownerEmail}</span>
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusBadgeClass[action.status]}`}
                    >
                      {action.status.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${priorityBadgeClass[action.priority]}`}
                    >
                      Priority {action.priority}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ACTION_STATUS_OPTIONS.map((option) => (
                      <button
                        key={`${action.id}-${option.value}`}
                        type="button"
                        onClick={() => void handleUpdateAction(action.id, { status: option.value })}
                        disabled={updatingActionId === action.id || action.status === option.value}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${
                          action.status === option.value
                            ? "border-[rgba(108,242,255,0.6)] bg-[rgba(108,242,255,0.18)] text-[var(--text-primary)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <select
                      value={action.priority}
                      onChange={(event) =>
                        void handleUpdateAction(action.id, { priority: event.target.value as ActionPriority })
                      }
                      disabled={updatingActionId === action.id}
                      className="rounded-full border border-[var(--border)] bg-[rgba(7,12,30,0.8)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ACTION_PRIORITY_OPTIONS.map((option) => (
                        <option key={`${action.id}-priority-${option.value}`} value={option.value}>
                          Priority: {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1 text-[11px] uppercase tracking-[0.06em]"
                      onClick={() => void handleUpdateAction(action.id, { status: "done" })}
                      disabled={updatingActionId === action.id || action.status === "done"}
                    >
                      Mark Done
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] text-[var(--danger)] hover:text-[var(--danger)]"
                      onClick={() => void handleDeleteAction(action.id)}
                      disabled={deletingActionId === action.id}
                    >
                      {deletingActionId === action.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </Card>

        <Card title="Approval" subtitle="Required before outbound actions">
          <Button
            onClick={handleApprove}
            disabled={approving || data.meeting.status !== "ready" || !data.meeting.actionsConfirmed}
            className={approving ? "glow-pulse" : ""}
          >
            {approving ? "Approving..." : "Approve Meeting"}
          </Button>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {!data.meeting.actionsConfirmed
              ? "Confirm actions first, then approve."
              : "Approval logs email intents for summary and action distribution."}
          </p>
        </Card>
      </div>
    );
  };

  const renderIntegrationsPanel = () => (
    <div className="space-y-6">
      <Card title="Platform Sync" subtitle="See whether your account is linked before sending tickets out">
        <div className="grid gap-3">
          {platformSyncItems.map((platform) => {
            const meta = platformStateMeta[platform.state];

            return (
              <div
                key={platform.name}
                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{platform.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{platform.detail}</p>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">{meta.description}</p>
                </div>
                <StatusPill label={meta.label} tone={meta.tone} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Jira Export" subtitle="Directly create Jira issues from confirmed actions">
        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
          {!jiraStatus?.configured && (
            <p>Set `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, and `JIRA_REDIRECT_URI` in the API env first.</p>
          )}

          {jiraStatus?.configured && !jiraStatus.connected && (
            <div className="space-y-2">
              <p>Jira is not connected yet.</p>
              <Button variant="secondary" onClick={handleConnectJira}>
                Connect Jira
              </Button>
            </div>
          )}

          {jiraStatus?.configured && jiraStatus.connected && (
            <div className="space-y-3">
              {jiraConnectedNotice && (
                <div className="rounded-xl border border-[rgba(56,255,179,0.35)] bg-[rgba(56,255,179,0.1)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Jira connected successfully</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Choose a site and project, then export the confirmed action plan.
                  </p>
                </div>
              )}
              <div className="grid gap-3">
                <select
                  value={jiraCloudId}
                  onChange={(event) => setJiraCloudId(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  disabled={jiraLoading || jiraExporting}
                >
                  {jiraSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>

                <select
                  value={jiraProjectKey}
                  onChange={(event) => setJiraProjectKey(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  disabled={jiraLoading || jiraExporting || jiraProjects.length === 0}
                >
                  {jiraProjects.map((project) => (
                    <option key={project.id} value={project.key}>
                      {project.key} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                onClick={handleExportToJira}
                disabled={jiraExporting || !data?.meeting.actionsConfirmed || !jiraCloudId || !jiraProjectKey || !data || data.actions.length === 0}
              >
                {jiraExporting ? "Exporting..." : "Export To Jira"}
              </Button>
              <Button variant="ghost" onClick={() => void loadJiraState()} disabled={jiraLoading || jiraExporting}>
                {jiraLoading ? "Refreshing Jira..." : "Refresh Jira"}
              </Button>

              {!data?.meeting.actionsConfirmed && (
                <p className="text-xs text-[var(--warning)]">Confirm the action plan before exporting.</p>
              )}

              {jiraResult && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Created {jiraResult.createdCount} Jira issues
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    {jiraResult.issues.map((issue) => (
                      <a
                        key={issue.key}
                        href={issue.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[var(--accent)] hover:underline"
                      >
                        {issue.key}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderApprovalPanel = () => {
    if (!data) return null;

    return (
      <Card title="Approval" subtitle="Meeting readiness and final approval controls">
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Meeting Status</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{data.meeting.status}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Actions Confirmed</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {data.meeting.actionsConfirmed ? "Confirmed" : "Pending"}
              </p>
            </div>
          </div>

          <Button
            onClick={handleApprove}
            disabled={approving || data.meeting.status !== "ready" || !data.meeting.actionsConfirmed}
            className={approving ? "glow-pulse" : ""}
          >
            {approving ? "Approving..." : "Approve Meeting"}
          </Button>
          <p className="text-xs text-[var(--text-muted)]">
            {!data.meeting.actionsConfirmed
              ? "Confirm actions before approval."
              : "Approval unlocks outbound execution and keeps the activity log auditable."}
          </p>
        </div>
      </Card>
    );
  };

  const renderTranscriptPanel = () => {
    if (!data) return null;

    return (
      <Card
        title="Transcript"
        subtitle="Expanded transcript view with export options"
        rightSlot={
          <div className="flex items-center gap-2">
            <select
              value={downloadFormat}
              onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              <option value="txt">TXT</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
            <Button variant="secondary" onClick={() => void handleDownloadTranscript()} disabled={!data.transcript?.text}>
              Download
            </Button>
          </div>
        }
      >
        <p className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-secondary)]">
          {data.transcript?.text ?? "No transcript"}
        </p>
      </Card>
    );
  };

  const renderSummaryPanel = () => (
    <Card title="Summary" subtitle="Decisions, risks, and notes in one place">
      <div className="grid gap-4 text-sm text-[var(--text-secondary)]">
        <p>
          <strong className="text-[var(--text-primary)]">Decisions:</strong> {data?.summary?.decisions ?? "-"}
        </p>
        <p>
          <strong className="text-[var(--text-primary)]">Risks:</strong> {data?.summary?.risks ?? "-"}
        </p>
        <p>
          <strong className="text-[var(--text-primary)]">Notes:</strong> {data?.summary?.notes ?? "-"}
        </p>
      </div>
    </Card>
  );

  const renderChatPanel = () => (
    <Card title="Chat" subtitle="Ask questions about this meeting without leaving review mode">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {chatHasMore ? (
            <Button variant="ghost" onClick={handleLoadOlderMessages} disabled={chatHistoryLoading}>
              {chatHistoryLoading ? "Loading older..." : "Load Older Messages"}
            </Button>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Latest conversation loaded</span>
          )}
          <Button variant="ghost" onClick={() => setConfirmClearOpen(true)} disabled={chatClearing}>
            {chatClearing ? "Clearing..." : "Clear Chat"}
          </Button>
        </div>

        <AnimatePresence>
          {confirmClearOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-[rgba(255,107,122,0.35)] bg-[rgba(255,107,122,0.1)] p-3"
            >
              <p className="text-sm font-medium text-[var(--text-primary)]">Clear this meeting chat history?</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">This removes all saved messages for this meeting.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={handleClearChat} disabled={chatClearing}>
                  {chatClearing ? "Clearing..." : "Yes, Clear"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmClearOpen(false)} disabled={chatClearing}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatViewportRef} className="relative max-h-[52vh] space-y-2 overflow-auto rounded-xl border border-[var(--border)] bg-[rgba(6,10,26,0.96)] p-3">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -top-10 right-6 h-28 w-28 rounded-full bg-[rgba(143,56,255,0.2)] blur-2xl" />
            <div className="absolute -bottom-8 left-5 h-24 w-24 rounded-full bg-[rgba(30,123,255,0.2)] blur-2xl" />
          </div>
          <div className="relative z-10 space-y-2">
            {chatMessages.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Try: &quot;What decisions were made?&quot;, &quot;Who owns onboarding?&quot;, &quot;What are blockers?&quot;
              </p>
            )}
            <AnimatePresence initial={false}>
              {chatMessages.map((message) => (
                <ChatConversationBubble key={message.id} message={message} />
              ))}
              {chatLoading && <ChatTypingIndicator key="typing-indicator" />}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="Ask about decisions, owners, risks, deadlines..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <Button onClick={handleAsk} disabled={chatLoading || !question.trim()}>
            {chatLoading ? "Asking..." : "Ask"}
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderTicketsPanel = () => (
    <Card title="Tickets" subtitle="Created issues and export state">
      <div className="space-y-4 text-sm text-[var(--text-secondary)]">
        <div className="rounded-xl border border-[rgba(120,145,255,0.24)] bg-[linear-gradient(135deg,rgba(30,123,255,0.12)_0%,rgba(143,56,255,0.08)_60%,rgba(255,180,0,0.06)_100%)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Active Ticket Format</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedTicketFormat.label}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedTicketFormat.description}</p>
            </div>
            <span className="rounded-full border border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)]">
              Active
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Ticket Field Profile</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Issue type</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{jiraTicketDetails.issueType || "Task"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Labels</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{jiraLabels.join(", ") || "None"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Components</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{jiraComponents.join(", ") || "None"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Advanced fields</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {jiraTicketDetails.advancedFieldsJson.trim() ? "Configured" : "None"}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Connected</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{jiraStatus?.connected ? "Jira ready" : "Not connected"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Created Tickets</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{jiraResult?.createdCount ?? 0}</p>
          </div>
        </div>
        {jiraResult?.issues.length ? (
          <div className="space-y-2">
            {jiraResult.issues.map((issue) => (
              <a
                key={issue.key}
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[var(--accent)] hover:underline"
              >
                {issue.key}
              </a>
            ))}
          </div>
        ) : (
          <p>No exported tickets yet. Use Integrations to connect Jira and export confirmed actions.</p>
        )}
      </div>
    </Card>
  );

  const renderPeoplePanel = () => {
    const owners = Array.from(new Set((data?.actions ?? []).map((action) => action.ownerEmail)));
    const attendees = data?.meeting.attendees ?? [];

    return (
      <Card title="People" subtitle="Attendees, owners, and responsible people">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Attendees</p>
            {attendees.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No attendees listed.</p>}
            {attendees.map((person) => (
              <div key={person} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm text-[var(--text-primary)]">
                {person}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Action Owners</p>
            {owners.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No owners assigned yet.</p>}
            {owners.map((person) => (
              <div key={person} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm text-[var(--text-primary)]">
                {person}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  const renderFilesPanel = () => (
    <Card title="Files" subtitle="Uploaded files and generated artifacts">
      <div className="space-y-3 text-sm text-[var(--text-secondary)]">
        {(data?.files.length ?? 0) === 0 && <p>No uploaded files recorded.</p>}
        {data?.files.map((file) => (
          <div key={file.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
            <p className="font-semibold text-[var(--text-primary)]">{file.originalName}</p>
            <p>{file.mimeType}</p>
            <p>{Math.round(file.size / 1024)} KB</p>
          </div>
        ))}
        {data?.transcript && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
            <p className="font-semibold text-[var(--text-primary)]">Generated transcript</p>
            <p>Available for TXT, CSV, PDF, and DOCX export.</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderTimelinePanel = () => {
    const timelineItems = [
      { label: "Meeting created", done: true, detail: new Date(data?.meeting.createdAt ?? "").toLocaleString() },
      { label: "File uploaded", done: Boolean(data?.files.length), detail: data?.files[0] ? data.files[0].originalName : "Waiting for upload" },
      { label: "Transcript processed", done: Boolean(data?.transcript), detail: data?.transcript ? "Transcript ready" : "Not processed yet" },
      { label: "Actions confirmed", done: Boolean(data?.meeting.actionsConfirmed), detail: data?.meeting.actionsConfirmed ? "Confirmed" : "Pending confirmation" },
      { label: "Meeting approved", done: data?.meeting.status === "approved", detail: data?.meeting.status === "approved" ? "Approved" : "Not approved yet" },
      { label: "Tickets exported", done: Boolean(jiraResult?.issues.length), detail: jiraResult?.issues.length ? `${jiraResult.issues.length} issues created` : "No export yet" },
    ];

    return (
      <Card title="Timeline" subtitle="Lifecycle of this meeting and delivery flow">
        <div className="space-y-3">
          {timelineItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <div className={`mt-0.5 h-3 w-3 rounded-full ${item.done ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderNotificationsPanel = () => {
    if (!data) return null;

    return (
      <div className="space-y-6">
        <Card title="Notifications" subtitle="Logs, pending actions, and delivery alerts">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Pending</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {data.actions.filter((item) => item.status !== "done").length}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Emails</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{data.emailLogs.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Alerts</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{error ? 1 : 0}</p>
            </div>
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </Card>

        <Card title="Email Logs" subtitle="Outbound activity generated from approvals and workflows">
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            {data.emailLogs.length === 0 && <li>No email logs yet</li>}
            {data.emailLogs.map((log) => (
              <li key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                <p className="font-semibold text-[var(--text-primary)]">{log.type.toUpperCase()}</p>
                <p>{log.recipient}</p>
                <p>{new Date(log.sentAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  };

  const renderSettingsPanel = () => {
    const settingsTabs: Array<{
      id: SettingsPanelTab;
      label: string;
      eyebrow: string;
      summary: string;
    }> = [
      {
        id: "formats",
        label: "Formats",
        eyebrow: "Templates",
        summary: "Choose the enterprise ticket structure used for exports.",
      },
      {
        id: "export-target",
        label: "Export Target",
        eyebrow: "Destination",
        summary: "See which delivery system is active for this meeting.",
      },
      {
        id: "project",
        label: "Project",
        eyebrow: "Routing",
        summary: "Control where approved actions are sent.",
      },
      {
        id: "fields",
        label: "Fields",
        eyebrow: "Payload",
        summary: "Set the Jira issue fields that should be sent on export.",
      },
      {
        id: "automation",
        label: "Automation",
        eyebrow: "Workflow",
        summary: "Manage future automation defaults for this meeting.",
      },
    ];

    const renderSettingsContent = () => {
      switch (settingsPanelTab) {
        case "export-target":
          return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Default Export Target</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {jiraStatus?.connected ? "Jira connected and available" : "No export target connected yet"}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Ticket exports currently route through Jira when the integration is connected and a project is selected.
              </p>
            </div>
          );
        case "project":
          return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Preferred Project</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{jiraProjectKey || "No Jira project selected yet"}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Pick a Jira site and project from the Integrations area. This setting reflects the current meeting target.
              </p>
            </div>
          );
        case "fields":
          return (
            <div className="space-y-4 rounded-2xl border border-[rgba(120,145,255,0.24)] bg-[linear-gradient(135deg,rgba(30,123,255,0.08)_0%,rgba(143,56,255,0.08)_60%,rgba(255,180,0,0.05)_100%)] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Ticket Fields</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Jira field mapping</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Control the Jira issue payload sent during export. Common fields are exposed directly, and advanced JSON can inject custom Jira fields.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Issue Type</span>
                  <input
                    value={jiraTicketDetails.issueType}
                    onChange={(event) =>
                      setJiraTicketDetails((current) => ({ ...current, issueType: event.target.value }))
                    }
                    placeholder="Task"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Labels</span>
                  <input
                    value={jiraTicketDetails.labelsText}
                    onChange={(event) =>
                      setJiraTicketDetails((current) => ({ ...current, labelsText: event.target.value }))
                    }
                    placeholder="orbitplan, customer-facing"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Components</span>
                  <input
                    value={jiraTicketDetails.componentsText}
                    onChange={(event) =>
                      setJiraTicketDetails((current) => ({ ...current, componentsText: event.target.value }))
                    }
                    placeholder="Platform API, Admin UI"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Environment</span>
                  <input
                    value={jiraTicketDetails.environment}
                    onChange={(event) =>
                      setJiraTicketDetails((current) => ({ ...current, environment: event.target.value }))
                    }
                    placeholder="Production, staging, internal admin"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Additional Context</span>
                <textarea
                  value={jiraTicketDetails.additionalContext}
                  onChange={(event) =>
                    setJiraTicketDetails((current) => ({ ...current, additionalContext: event.target.value }))
                  }
                  rows={4}
                  placeholder="Escalation notes, rollout constraints, customer impact, internal references..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Advanced Jira Fields JSON</span>
                <textarea
                  value={jiraTicketDetails.advancedFieldsJson}
                  onChange={(event) =>
                    setJiraTicketDetails((current) => ({ ...current, advancedFieldsJson: event.target.value }))
                  }
                  rows={8}
                  placeholder={'{"customfield_10011":"ENG","customfield_10020":8}'}
                  className="w-full rounded-xl border border-[var(--border)] bg-[rgba(7,12,30,0.7)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Use this for custom Jira fields such as story points, team fields, epic links, request types, or any project-specific schema.
                </p>
              </label>
            </div>
          );
        case "automation":
          return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Automation Toggles</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Not wired yet</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Meeting-level automation controls are not wired yet in this workspace, but this tab leaves space for those defaults.
              </p>
            </div>
          );
        case "formats":
        default:
          return (
            <div className="rounded-2xl border border-[rgba(120,145,255,0.24)] bg-[linear-gradient(135deg,rgba(30,123,255,0.1)_0%,rgba(143,56,255,0.08)_58%,rgba(255,180,0,0.05)_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Formats</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Ticket creation presets</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Choose how tickets should be structured when this meeting exports actions into Jira.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {TICKET_FORMAT_PRESETS.map((preset) => {
                  const isSelected = ticketFormatPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTicketFormatPreset(preset.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[rgba(56,255,179,0.42)] bg-[rgba(56,255,179,0.12)] shadow-[0_16px_30px_-24px_rgba(56,255,179,0.8)]"
                          : "border-[rgba(120,145,255,0.2)] bg-[rgba(7,12,30,0.45)] hover:border-[rgba(120,145,255,0.36)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{preset.label}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{preset.description}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            isSelected
                              ? "border border-[rgba(56,255,179,0.32)] bg-[rgba(56,255,179,0.14)] text-[var(--success)]"
                              : "border border-[rgba(120,145,255,0.2)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]"
                          }`}
                        >
                          {isSelected ? "Selected" : "Preset"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {preset.sections.map((section) => (
                          <span
                            key={section}
                            className="rounded-full border border-[rgba(120,145,255,0.18)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]"
                          >
                            {section}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
      }
    };

    return (
      <Card title="Settings" subtitle="Meeting-level working defaults">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[rgba(120,145,255,0.18)] bg-[rgba(255,255,255,0.03)] p-2">
            <div className="space-y-2">
              {settingsTabs.map((tab) => {
                const isActive = settingsPanelTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsPanelTab(tab.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[rgba(56,255,179,0.32)] bg-[rgba(56,255,179,0.12)] shadow-[0_16px_28px_-24px_rgba(56,255,179,0.8)]"
                        : "border-transparent bg-[rgba(7,12,30,0.34)] hover:border-[rgba(120,145,255,0.24)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{tab.eyebrow}</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{tab.label}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{tab.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">{renderSettingsContent()}</div>
        </div>
      </Card>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const fetchMeeting = async () => {
      try {
        const meeting = await getMeeting(id);
        const history = await getMeetingChatHistory(id, { limit: CHAT_PAGE_SIZE });
        if (isMounted) {
          setData(meeting);
          if (history.messages.length > 0) {
            setChatMessages(history.messages);
            setChatCursor(history.nextBefore);
            setChatHasMore(Boolean(history.nextBefore));
            hasSeededChatRef.current = true;
          } else {
            setChatMessages([]);
            setChatCursor(null);
            setChatHasMore(false);
          }
        }
      } catch (requestError) {
        if (isMounted) setError(requestError instanceof Error ? requestError.message : "Failed to load meeting");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchMeeting();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedValue = window.localStorage.getItem(`orbitplan:ticket-format:${id}`);
    if (!storedValue) return;
    if (TICKET_FORMAT_PRESETS.some((preset) => preset.id === storedValue)) {
      setTicketFormatPreset(storedValue as TicketFormatPreset);
    }
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`orbitplan:ticket-format:${id}`, ticketFormatPreset);
  }, [id, ticketFormatPreset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedValue = window.localStorage.getItem(`orbitplan:jira-ticket-details:${id}`);
    if (!storedValue) return;
    try {
      const parsed = JSON.parse(storedValue) as Partial<JiraTicketDetailsDraft>;
      setJiraTicketDetails({
        issueType: parsed.issueType?.trim() || DEFAULT_JIRA_TICKET_DETAILS.issueType,
        labelsText: parsed.labelsText ?? DEFAULT_JIRA_TICKET_DETAILS.labelsText,
        componentsText: parsed.componentsText ?? DEFAULT_JIRA_TICKET_DETAILS.componentsText,
        environment: parsed.environment ?? DEFAULT_JIRA_TICKET_DETAILS.environment,
        additionalContext: parsed.additionalContext ?? DEFAULT_JIRA_TICKET_DETAILS.additionalContext,
        advancedFieldsJson: parsed.advancedFieldsJson ?? DEFAULT_JIRA_TICKET_DETAILS.advancedFieldsJson,
      });
    } catch {
      window.localStorage.removeItem(`orbitplan:jira-ticket-details:${id}`);
    }
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`orbitplan:jira-ticket-details:${id}`, JSON.stringify(jiraTicketDetails));
  }, [id, jiraTicketDetails]);

  const loadJiraState = async () => {
    setJiraLoading(true);
    try {
      const status = await getJiraStatus();
      setJiraStatus(status);

      if (!status.connected) {
        setJiraSites([]);
        setJiraProjects([]);
        setJiraCloudId("");
        setJiraProjectKey("");
        return;
      }

      const sites = await getJiraSites();
      setJiraSites(sites);
      const selectedCloudId = jiraCloudId && sites.some((site) => site.id === jiraCloudId) ? jiraCloudId : (sites[0]?.id ?? "");
      setJiraCloudId(selectedCloudId);

      if (selectedCloudId) {
        const projects = await getJiraProjects(selectedCloudId);
        setJiraProjects(projects);
        const selectedProjectKey =
          jiraProjectKey && projects.some((project) => project.key === jiraProjectKey) ? jiraProjectKey : (projects[0]?.key ?? "");
        setJiraProjectKey(selectedProjectKey);
      } else {
        setJiraProjects([]);
        setJiraProjectKey("");
      }
    } catch (jiraError) {
      setError(jiraError instanceof Error ? jiraError.message : "Failed to load Jira integration");
    } finally {
      setJiraLoading(false);
    }
  };

  useEffect(() => {
    void loadJiraState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jiraStatus?.connected || !jiraCloudId) return;
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const projects = await getJiraProjects(jiraCloudId);
        if (!isMounted) return;
        setJiraProjects(projects);
        setJiraProjectKey(projects[0]?.key ?? "");
      } catch (jiraError) {
        if (isMounted) setError(jiraError instanceof Error ? jiraError.message : "Failed to load Jira projects");
      }
    };

    void loadProjects();
    return () => {
      isMounted = false;
    };
  }, [jiraCloudId, jiraStatus?.connected]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "orbitplan:jira-connected") return;
      setJiraConnectedNotice(true);
      void loadJiraState();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!hasSeededChatRef.current && chatMessages.length === 0) {
      hasSeededChatRef.current = true;
      setChatMessages([
        {
          id: `a-welcome-${Date.now()}`,
          role: "assistant",
          text: "Hi, I am OrbitBot. How can I assist you with this meeting? You can ask about decisions, owners, risks, timelines, or next steps.",
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    const viewport = chatViewportRef.current;
    if (!viewport) return;
    const id = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [chatMessages, chatLoading, activeTab]);

  const handleApprove = async () => {
    if (!data) return;
    setApproving(true);
    setError(null);
    try {
      const nextData = await approveMeeting(data.meeting.id);
      setData(nextData);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleAsk = async () => {
    if (!data || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setChatLoading(true);
    setError(null);

    try {
      const response = await askMeetingQuestion(data.meeting.id, q);
      if (response.messages && response.messages.length > 0) {
        setChatMessages((prev) => [...prev, ...response.messages]);
      } else {
        const fallbackMessages: ChatMessage[] = [
          {
            id: `u-${Date.now()}`,
            role: "user",
            text: q,
            createdAt: new Date().toISOString(),
          },
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: response.answer,
            citations: response.citations,
            createdAt: new Date().toISOString(),
          },
        ];
        setChatMessages((prev) => [...prev, ...fallbackMessages]);
      }
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Meeting chat failed");
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void handleAsk();
  };

  const handleLoadOlderMessages = async () => {
    if (!data || !chatCursor || chatHistoryLoading) return;
    setChatHistoryLoading(true);
    setError(null);
    try {
      const history = await getMeetingChatHistory(data.meeting.id, {
        limit: CHAT_PAGE_SIZE,
        before: chatCursor,
      });
      setChatMessages((prev) => [...history.messages, ...prev]);
      setChatCursor(history.nextBefore);
      setChatHasMore(Boolean(history.nextBefore));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Failed to load chat history");
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!data || chatClearing) return;
    setChatClearing(true);
    setError(null);
    try {
      await clearMeetingChatHistory(data.meeting.id);
      setChatMessages([]);
      setChatCursor(null);
      setChatHasMore(false);
      hasSeededChatRef.current = false;
      setConfirmClearOpen(false);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear chat");
    } finally {
      setChatClearing(false);
    }
  };

  const handleRetryProcessing = async () => {
    if (!data) return;
    setError(null);
    setRetryingProcess(true);
    try {
      const updated = await processMeeting(data.meeting.id);
      setData(updated);
    } catch (retryError) {
      setError(getProcessingErrorMessage(retryError));
    } finally {
      setRetryingProcess(false);
    }
  };

  const handleUpdateAction = async (
    actionId: string,
    patch: { status?: ActionStatus; priority?: ActionPriority },
  ) => {
    if (!data || updatingActionId) return;
    setUpdatingActionId(actionId);
    setError(null);
    try {
      const updated = await updateMeetingAction(data.meeting.id, actionId, patch);
      setData(updated);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update action");
    } finally {
      setUpdatingActionId(null);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!data || deletingActionId) return;
    setDeletingActionId(actionId);
    setError(null);
    try {
      const updated = await deleteMeetingAction(data.meeting.id, actionId);
      setData(updated);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete action");
    } finally {
      setDeletingActionId(null);
    }
  };

  const handleConnectJira = async () => {
    try {
      const url = await getJiraAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (jiraError) {
      setError(jiraError instanceof Error ? jiraError.message : "Failed to start Jira connection");
    }
  };

  const handleExportToJira = async () => {
    if (!data || !jiraCloudId || !jiraProjectKey) return;
    setJiraExporting(true);
    setError(null);
    setJiraResult(null);
    try {
      let advancedFields: Record<string, unknown> | undefined;
      if (jiraTicketDetails.advancedFieldsJson.trim()) {
        const parsed = JSON.parse(jiraTicketDetails.advancedFieldsJson) as unknown;
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          throw new Error("Advanced Jira fields must be a JSON object.");
        }
        advancedFields = parsed as Record<string, unknown>;
      }

      const result = await exportMeetingToJira({
        meetingId: data.meeting.id,
        cloudId: jiraCloudId,
        projectKey: jiraProjectKey,
        ticketFormatPreset,
        ticketDetails: {
          issueType: jiraTicketDetails.issueType.trim() || "Task",
          labels: jiraLabels,
          components: jiraComponents,
          environment: jiraTicketDetails.environment.trim() || undefined,
          additionalContext: jiraTicketDetails.additionalContext.trim() || undefined,
          advancedFields,
        },
      });
      setJiraResult(result);
    } catch (jiraError) {
      setError(jiraError instanceof Error ? jiraError.message : "Failed to export to Jira");
    } finally {
      setJiraExporting(false);
    }
  };

  const handleConfirmActions = async (confirmed: boolean) => {
    if (!data || confirmingActions) return;
    setConfirmingActions(confirmed ? "accept" : "fallback");
    setError(null);
    try {
      const updated = await confirmMeetingActions(data.meeting.id, confirmed);
      setData(updated);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Failed to confirm action plan");
    } finally {
      setConfirmingActions(null);
    }
  };

  const handleDownloadTranscript = async () => {
    if (!data?.transcript?.text) return;

    const safeTitle = data.meeting.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const fallbackTitle = safeTitle || "meeting";
    const createdAt = new Date(data.meeting.createdAt).toLocaleString();
    const attendees = data.meeting.attendees.join(", ");

    let content = "";
    let mimeType = "text/plain;charset=utf-8";

    if (downloadFormat === "pdf") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 44;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 16;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(data.meeting.title, margin, y);
      y += lineHeight * 1.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Created: ${createdAt}`, margin, y);
      y += lineHeight;
      doc.text(`Attendees: ${attendees || "none"}`, margin, y);
      y += lineHeight * 1.5;
      doc.setFont("helvetica", "bold");
      doc.text("Transcript", margin, y);
      y += lineHeight;
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(data.transcript.text, maxWidth) as string[];
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`${fallbackTitle}-transcript.pdf`);
      return;
    } else if (downloadFormat === "docx") {
      const document = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: data.meeting.title, bold: true, size: 30 })],
              }),
              new Paragraph({ children: [new TextRun(`Created: ${createdAt}`)] }),
              new Paragraph({ children: [new TextRun(`Attendees: ${attendees || "none"}`)] }),
              new Paragraph({ children: [new TextRun("")] }),
              new Paragraph({
                children: [new TextRun({ text: "Transcript", bold: true, size: 24 })],
              }),
              ...data.transcript.text.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fallbackTitle}-transcript.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    } else if (downloadFormat === "csv") {
      const escapedTranscript = data.transcript.text.replace(/"/g, '""').replace(/\n/g, "\\n");
      content = `meeting_id,title,created_at,attendees,transcript\n"${data.meeting.id}","${data.meeting.title.replace(/"/g, '""')}","${data.meeting.createdAt}","${attendees.replace(/"/g, '""')}","${escapedTranscript}"\n`;
      mimeType = "text/csv;charset=utf-8";
    } else {
      content = `Title: ${data.meeting.title}\nCreated: ${createdAt}\nAttendees: ${attendees || "none"}\n\nTranscript\n${data.transcript.text}\n`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fallbackTitle}-transcript.${downloadFormat}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const sidebarTools: Array<{
    id: ReviewSidebarTool;
    title: string;
    icon: ReactNode;
    activeClass: string;
    idleClass: string;
    modalTitle: string;
    modalSubtitle: string;
    modalWidth?: string;
  }> = [
    {
      id: "integrations",
      title: "Integrations",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
          <path d="M7 7h10v10H7z" />
          <path d="M4 12h3" />
          <path d="M17 12h3" />
          <path d="M12 4v3" />
          <path d="M12 17v3" />
        </svg>
      ),
      activeClass: "border-[rgba(120,145,255,0.5)] bg-[linear-gradient(145deg,rgba(30,123,255,0.34)_0%,rgba(143,56,255,0.3)_68%,rgba(255,180,0,0.14)_100%)] shadow-[0_18px_30px_-22px_rgba(30,123,255,0.95)]",
      idleClass: "border-[rgba(120,145,255,0.3)] bg-[linear-gradient(145deg,rgba(30,123,255,0.18)_0%,rgba(143,56,255,0.16)_68%,rgba(255,180,0,0.08)_100%)] hover:border-[rgba(120,145,255,0.48)]",
      modalTitle: "Connected Platforms",
      modalSubtitle: "Review what is connected and manage ticket export from one place.",
      modalWidth: "max-w-3xl",
    },
    {
      id: "approval",
      title: "Approval",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="m5 12 4 4L19 6" /></svg>,
      activeClass: "border-[rgba(56,255,179,0.48)] bg-[linear-gradient(145deg,rgba(56,255,179,0.26)_0%,rgba(30,123,255,0.22)_68%,rgba(143,56,255,0.16)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(56,255,179,0.38)]",
      modalTitle: "Approval",
      modalSubtitle: "Check readiness and approve the meeting when the action plan is confirmed.",
      modalWidth: "max-w-2xl",
    },
    {
      id: "tickets",
      title: "Tickets",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="M7 8h10v8H7z" /><path d="M10 8V6" /><path d="M14 8V6" /></svg>,
      activeClass: "border-[rgba(255,180,0,0.48)] bg-[linear-gradient(145deg,rgba(255,180,0,0.24)_0%,rgba(30,123,255,0.18)_68%,rgba(143,56,255,0.14)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,180,0,0.38)]",
      modalTitle: "Tickets",
      modalSubtitle: "Created issues, sync history, and export results.",
      modalWidth: "max-w-3xl",
    },
    {
      id: "people",
      title: "People",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M15 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M4 19a5 5 0 0 1 10 0" /><path d="M13 19a4 4 0 0 1 7 0" /></svg>,
      activeClass: "border-[rgba(56,255,179,0.42)] bg-[linear-gradient(145deg,rgba(56,255,179,0.2)_0%,rgba(255,255,255,0.08)_68%,rgba(30,123,255,0.12)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(56,255,179,0.34)]",
      modalTitle: "People",
      modalSubtitle: "Attendees, owners, and responsible people for this meeting.",
      modalWidth: "max-w-3xl",
    },
    {
      id: "files",
      title: "Files",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="M7 4h7l3 3v13H7z" /><path d="M14 4v4h4" /></svg>,
      activeClass: "border-[rgba(120,145,255,0.44)] bg-[linear-gradient(145deg,rgba(30,123,255,0.22)_0%,rgba(255,255,255,0.06)_68%,rgba(143,56,255,0.12)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(120,145,255,0.42)]",
      modalTitle: "Files",
      modalSubtitle: "Uploaded media, transcript artifacts, and generated outputs.",
      modalWidth: "max-w-3xl",
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="M12 4a4 4 0 0 1 4 4v2.5c0 .8.3 1.6.9 2.2l1.1 1.1H6l1.1-1.1c.6-.6.9-1.4.9-2.2V8a4 4 0 0 1 4-4Z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>,
      activeClass: "border-[rgba(255,107,122,0.46)] bg-[linear-gradient(145deg,rgba(255,107,122,0.2)_0%,rgba(30,123,255,0.16)_68%,rgba(255,255,255,0.06)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,107,122,0.34)]",
      modalTitle: "Notifications",
      modalSubtitle: "Logs, failed sends, pending work, and alerts.",
      modalWidth: "max-w-3xl",
    },
    {
      id: "settings",
      title: "Settings",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3.8a7.6 7.6 0 0 0-1.7-1L14.5 3h-5l-.4 2.8a7.6 7.6 0 0 0-1.7 1l-2.3-.8-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-.8a7.6 7.6 0 0 0 1.7 1l.4 2.8h5l.4-2.8a7.6 7.6 0 0 0 1.7-1l2.3.8 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></svg>,
      activeClass: "border-[rgba(120,145,255,0.46)] bg-[linear-gradient(145deg,rgba(120,145,255,0.22)_0%,rgba(255,255,255,0.06)_68%,rgba(30,123,255,0.12)_100%)]",
      idleClass: "border-[rgba(120,145,255,0.24)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(120,145,255,0.38)]",
      modalTitle: "Settings",
      modalSubtitle: "Meeting-level export defaults and automation preferences.",
      modalWidth: "max-w-2xl",
    },
  ];

  const activeToolMeta = activeSidebarTool ? sidebarTools.find((tool) => tool.id === activeSidebarTool) ?? null : null;

  const renderSidebarToolContent = () => {
    switch (activeSidebarTool) {
      case "integrations":
        return renderIntegrationsPanel();
      case "approval":
        return renderApprovalPanel();
      case "transcript":
        return renderTranscriptPanel();
      case "summary":
        return renderSummaryPanel();
      case "chat":
        return renderChatPanel();
      case "tickets":
        return renderTicketsPanel();
      case "people":
        return renderPeoplePanel();
      case "files":
        return renderFilesPanel();
      case "timeline":
        return renderTimelinePanel();
      case "notifications":
        return renderNotificationsPanel();
      case "settings":
        return renderSettingsPanel();
      default:
        return null;
    }
  };

  return (
    <RequireAuth>
      <AppShell
        sidebarContent={
          <div className="space-y-3 overflow-y-auto pr-1">
            {sidebarTools.map((tool) => {
              const isActive = activeSidebarTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveSidebarTool(tool.id)}
                  className={`group relative w-full overflow-hidden rounded-[22px] border p-4 text-left transition ${
                    isActive ? tool.activeClass : tool.idleClass
                  }`}
                >
                  <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[linear-gradient(180deg,var(--accent)_0%,var(--accent-strong)_100%)]" />
                  <div className="ml-3 flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(120,145,255,0.24)] bg-[rgba(7,12,30,0.72)] text-[var(--text-primary)]">
                      {tool.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--text-primary)]">{tool.title}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        }
        sidebarCollapsedContent={
          <div className="flex flex-col items-center gap-4 overflow-y-auto px-1 pt-2">
            {sidebarTools.map((tool) => {
              const isActive = activeSidebarTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveSidebarTool(tool.id)}
                  className={`group relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border transition ${
                    isActive ? tool.activeClass : tool.idleClass
                  }`}
                  aria-label={`Open ${tool.title}`}
                  title={tool.title}
                >
                  <div className="absolute inset-1 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(4,9,24,0.28)]" />
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(120,145,255,0.2)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.85)]">
                    {tool.icon}
                  </div>
                </button>
              );
            })}
          </div>
        }
      >
        {loading && <p className="text-sm text-[var(--text-secondary)]">Loading meeting...</p>}
        {error && <p className="mb-4 text-sm font-medium text-[var(--danger)]">{error}</p>}

        {data && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card
              title={data.meeting.title}
              subtitle={new Date(data.meeting.createdAt).toLocaleString()}
              rightSlot={<StatusPill label={data.meeting.status.toUpperCase()} tone={statusTone(data.meeting.status)} />}
            >
              <p className="text-sm text-[var(--text-secondary)]">
                Attendees: {data.meeting.attendees.join(", ") || "none"}
              </p>
            </Card>

            <Card
              title="Transcript"
              subtitle="Generated in process stage"
              rightSlot={
                <div className="flex items-center gap-2">
                  <select
                    value={downloadFormat}
                    onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="txt">TXT</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                  </select>
                  <Button variant="secondary" onClick={() => void handleDownloadTranscript()} disabled={!data.transcript?.text}>
                    Download
                  </Button>
                </div>
              }
            >
              <p className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-secondary)]">
                {data.transcript?.text ?? "No transcript"}
              </p>
            </Card>

            <Card title="Intelligence Workspace" subtitle="Switch between summary and AI chat">
              <div className="space-y-4">
                <div className="inline-flex rounded-xl border border-[var(--border)] bg-[rgba(9,14,36,0.75)] p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("summary")}
                    className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "summary" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {activeTab === "summary" && (
                      <motion.span
                        layoutId="workspace-tab-active-pill"
                        className="absolute inset-0 rounded-lg bg-[rgba(30,123,255,0.2)] shadow-[0_0_0_1px_rgba(120,145,255,0.48)]"
                        transition={{ type: "spring", stiffness: 340, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Summary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeTab === "chat" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {activeTab === "chat" && (
                      <motion.span
                        layoutId="workspace-tab-active-pill"
                        className="absolute inset-0 rounded-lg bg-[rgba(143,56,255,0.2)] shadow-[0_0_0_1px_rgba(143,56,255,0.45)]"
                        transition={{ type: "spring", stiffness: 340, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Chat</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                  <AnimatePresence mode="wait" initial={false}>
                    {activeTab === "summary" ? (
                      <motion.div
                        key="summary-pane"
                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className="grid gap-4 text-sm text-[var(--text-secondary)]"
                      >
                        <p>
                          <strong className="text-[var(--text-primary)]">Decisions:</strong> {data.summary?.decisions ?? "-"}
                        </p>
                        <p>
                          <strong className="text-[var(--text-primary)]">Risks:</strong> {data.summary?.risks ?? "-"}
                        </p>
                        <p>
                          <strong className="text-[var(--text-primary)]">Notes:</strong> {data.summary?.notes ?? "-"}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="chat-pane"
                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {chatHasMore ? (
                            <Button variant="ghost" onClick={handleLoadOlderMessages} disabled={chatHistoryLoading}>
                              {chatHistoryLoading ? "Loading older..." : "Load Older Messages"}
                            </Button>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">Latest conversation loaded</span>
                          )}
                          <Button variant="ghost" onClick={() => setConfirmClearOpen(true)} disabled={chatClearing}>
                            {chatClearing ? "Clearing..." : "Clear Chat"}
                          </Button>
                        </div>

                        <AnimatePresence>
                          {confirmClearOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="rounded-xl border border-[rgba(255,107,122,0.35)] bg-[rgba(255,107,122,0.1)] p-3"
                            >
                              <p className="text-sm font-medium text-[var(--text-primary)]">Clear this meeting chat history?</p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                This removes all saved messages for this meeting.
                              </p>
                              <div className="mt-3 flex gap-2">
                                <Button variant="secondary" onClick={handleClearChat} disabled={chatClearing}>
                                  {chatClearing ? "Clearing..." : "Yes, Clear"}
                                </Button>
                                <Button variant="ghost" onClick={() => setConfirmClearOpen(false)} disabled={chatClearing}>
                                  Cancel
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div
                          ref={chatViewportRef}
                          className="relative max-h-72 space-y-2 overflow-auto rounded-xl border border-[var(--border)] bg-[rgba(6,10,26,0.96)] p-3"
                        >
                          <div className="pointer-events-none absolute inset-0 opacity-70">
                            <div className="absolute -top-10 right-6 h-28 w-28 rounded-full bg-[rgba(143,56,255,0.2)] blur-2xl" />
                            <div className="absolute -bottom-8 left-5 h-24 w-24 rounded-full bg-[rgba(30,123,255,0.2)] blur-2xl" />
                          </div>

                          <div className="relative z-10 space-y-2">
                            {chatMessages.length === 0 && (
                              <p className="text-xs text-[var(--text-muted)]">
                                Try: &quot;What decisions were made?&quot;, &quot;Who owns onboarding?&quot;,
                                &quot;What are blockers?&quot;
                              </p>
                            )}
                            <AnimatePresence initial={false}>
                              {chatMessages.map((message) => (
                                <ChatConversationBubble key={message.id} message={message} />
                              ))}
                              {chatLoading && <ChatTypingIndicator key="typing-indicator" />}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <input
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            onKeyDown={handleQuestionKeyDown}
                            placeholder="Ask about decisions, owners, risks, deadlines..."
                            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                          />
                          <Button onClick={handleAsk} disabled={chatLoading || !question.trim()}>
                            {chatLoading ? "Asking..." : "Ask"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[rgba(120,145,255,0.24)] bg-[linear-gradient(135deg,rgba(30,123,255,0.12)_0%,rgba(143,56,255,0.08)_58%,rgba(255,180,0,0.06)_100%)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Review Control Center</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Move between execution, integrations, and delivery activity without stacking every control in one column.
              </p>
            </div>
            <Tabs
              defaultValue="execution"
              tabs={[
                {
                  title: "Execution",
                  value: "execution",
                  meta: `${data.actions.length} action${data.actions.length === 1 ? "" : "s"}`,
                  content: renderExecutionPanel(),
                },
              ]}
            />
          </div>
          </div>
        )}

        <AnimatePresence>
          {activeToolMeta && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,4,12,0.72)] p-4 backdrop-blur-md"
              onClick={() => setActiveSidebarTool(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`max-h-[85vh] w-full ${activeToolMeta.modalWidth ?? "max-w-3xl"} overflow-auto rounded-[28px] border border-[rgba(120,145,255,0.3)] bg-[rgba(5,9,24,0.96)] p-5 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.95)]`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{activeToolMeta.title}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{activeToolMeta.modalTitle}</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{activeToolMeta.modalSubtitle}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setActiveSidebarTool(null)}>
                    Close
                  </Button>
                </div>

                {renderSidebarToolContent()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AppShell>
    </RequireAuth>
  );
}
