"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type MovingBorderLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function MovingBorderLink({ href, children, className = "" }: MovingBorderLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex overflow-hidden rounded-xl p-[1px] shadow-[0_0_0_1px_rgba(95,124,255,0.22)] ${className}`}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(255,180,0,0.95)_0%,rgba(143,56,255,0.7)_42%,rgba(30,123,255,0)_75%)] blur-[2px]"
        animate={{
          x: [0, 120, 120, 0, 0],
          y: [0, 0, 40, 40, 0],
        }}
        transition={{
          duration: 3.2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2 rounded-[11px] border border-[rgba(120,145,255,0.34)] bg-[rgba(7,10,28,0.95)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition group-hover:bg-[rgba(13,18,46,0.98)]">
        {children}
      </span>
    </Link>
  );
}
