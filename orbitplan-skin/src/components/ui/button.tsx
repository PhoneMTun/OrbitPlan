import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-[#061018] hover:brightness-110 shadow-[0_0_24px_rgba(34,184,255,0.36)]",
  secondary: "bg-[var(--surface-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${className}`}
    />
  );
}
