type StatusPillProps = {
  label: string;
  tone?: "neutral" | "success" | "warning";
};

const toneClass: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  success: "bg-[rgba(56,255,179,0.18)] text-[var(--success)]",
  warning: "bg-[rgba(255,213,106,0.2)] text-[var(--warning)]",
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass[tone]}`}>{label}</span>;
}
