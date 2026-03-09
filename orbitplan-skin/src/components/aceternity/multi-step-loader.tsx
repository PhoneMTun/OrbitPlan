"use client";

import { motion } from "framer-motion";

export type MultiStepLoaderItem = {
  title: string;
  description?: string;
};

type MultiStepLoaderProps = {
  loadingStates: MultiStepLoaderItem[];
  currentStep: number;
  loading: boolean;
  blocked?: boolean;
  blockedLabel?: string;
};

export function MultiStepLoader({
  loadingStates,
  currentStep,
  loading,
  blocked = false,
  blockedLabel = "Blocked",
}: MultiStepLoaderProps) {
  const activeIndex = Math.max(0, Math.min(currentStep, loadingStates.length - 1));

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(120,145,255,0.18)] bg-[linear-gradient(180deg,rgba(8,12,30,0.92)_0%,rgba(7,11,26,0.86)_100%)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {loadingStates.map((state, index) => {
          const isComplete = !blocked && index < activeIndex;
          const isActive = !blocked && index === activeIndex;

          return (
            <div key={state.title} className="flex items-center gap-2">
              <div className="relative flex items-center gap-2">
                <div
                  className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold transition ${
                    isActive
                      ? "border-[rgba(108,242,255,0.45)] bg-[rgba(108,242,255,0.14)] text-[var(--text-primary)]"
                      : isComplete
                        ? "border-[rgba(56,255,179,0.38)] bg-[rgba(56,255,179,0.14)] text-[var(--success)]"
                        : "border-[rgba(120,145,255,0.16)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]"
                  }`}
                >
                  {isComplete ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  ) : isActive && loading ? (
                    <motion.span
                      className="block h-2.5 w-2.5 rounded-full bg-current"
                      animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : (
                    index + 1
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isActive || isComplete ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                    {state.title}
                  </p>
                  {state.description && (
                    <p className="text-xs text-[var(--text-muted)]">{state.description}</p>
                  )}
                </div>
              </div>
              {index < loadingStates.length - 1 && (
                <div className="mx-1 h-px w-8 bg-[linear-gradient(90deg,rgba(120,145,255,0.28)_0%,rgba(120,145,255,0.08)_100%)]" />
              )}
            </div>
          );
        })}
        {blocked && (
          <div className="rounded-full border border-[rgba(255,107,122,0.34)] bg-[rgba(255,107,122,0.12)] px-3 py-1 text-xs font-semibold text-[var(--danger)]">
            {blockedLabel}
          </div>
        )}
      </div>
    </div>
  );
}
