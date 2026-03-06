"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spotlight } from "@/components/aceternity/spotlight";
import { EncryptedText } from "@/components/aceternity/encrypted-text";
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { TypewriterEffect } from "@/components/aceternity/typewriter-effect";
import { StatusPill } from "@/components/ui/status-pill";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)] backdrop-blur-md md:p-10">
      <Spotlight className="-top-44 -left-40" fill="#2c79ff" />
      <Spotlight className="-top-40 right-0" fill="#9e3dff" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)]" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusPill label="Aceternity-Style Motion" tone="success" />
          <StatusPill label="Human Approval Workflow" tone="warning" />
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">OrbitPlan Platform</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
          Turn Raw Meetings Into <span className="brand-gradient">Clear Execution</span>
        </h2>
        <div className="mt-4 max-w-3xl space-y-1 text-sm text-[var(--text-secondary)] md:text-base">
          <TextGenerateEffect words="Capture the signal from every meeting." delay={0.2} />
          <TextGenerateEffect words="Convert spoken context into accountable action." delay={0.45} />
          <EncryptedText
            text="Approve delivery with confidence before anything ships."
            className="inline-block"
            revealDelayMs={34}
            flipDelayMs={34}
            encryptedClassName="text-[var(--accent)]/70"
            revealedClassName="text-[var(--text-secondary)]"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/upload"
            className="glow-pulse rounded-xl bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent-warm)] px-5 py-2 text-sm font-semibold text-[#061018]"
          >
            Launch Upload Flow
          </Link>
          <TypewriterEffect
            phrases={[
              "From Audio to Action",
              "From Discussion to Delivery",
              "From Meetings to Momentum",
            ]}
            className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]"
          />
        </div>
      </motion.div>
    </section>
  );
}
