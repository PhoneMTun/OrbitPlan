"use client";

type OrbitLoaderProps = {
  label?: string;
};

export function OrbitLoader({ label = "Processing meeting..." }: OrbitLoaderProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
      <span className="small-orbit-loader" aria-hidden>
        <span className="small-orbit-ring small-orbit-ring-1" />
        <span className="small-orbit-ring small-orbit-ring-2" />
        <span className="small-orbit-core" />
      </span>
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
