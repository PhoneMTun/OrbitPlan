"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";

type TabsItem = {
  title: string;
  value: string;
  content: ReactNode;
  meta?: string;
};

type TabsProps = {
  tabs: TabsItem[];
  defaultValue?: string;
};

export function Tabs({ tabs, defaultValue }: TabsProps) {
  const initialValue = defaultValue && tabs.some((tab) => tab.value === defaultValue) ? defaultValue : tabs[0]?.value;
  const [activeTab, setActiveTab] = useState(initialValue);
  const currentTab = tabs.find((tab) => tab.value === activeTab) ?? tabs[0];

  if (!currentTab) return null;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(7,12,30,0.78)] p-1.5">
          {tabs.map((tab) => {
            const isActive = tab.value === currentTab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`relative min-w-[140px] flex-1 rounded-xl px-4 py-3 text-left transition ${
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="aceternity-review-tabs-active"
                    className="absolute inset-0 rounded-xl border border-[rgba(120,145,255,0.4)] bg-[linear-gradient(135deg,rgba(30,123,255,0.22)_0%,rgba(143,56,255,0.18)_62%,rgba(255,180,0,0.12)_100%)] shadow-[0_18px_36px_-24px_rgba(30,123,255,0.8)]"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
                <span className="relative z-10 block text-sm font-semibold">{tab.title}</span>
                {tab.meta && <span className="relative z-10 mt-1 block text-[11px] text-[var(--text-muted)]">{tab.meta}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentTab.value}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {currentTab.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
