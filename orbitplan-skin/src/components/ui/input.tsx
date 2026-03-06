import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, className = "", ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)]">
      {label}
      <input
        {...props}
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(108,242,255,0.2)] ${className}`}
      />
      {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
