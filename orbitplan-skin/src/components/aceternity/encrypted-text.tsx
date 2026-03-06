"use client";

import { useEffect, useMemo, useState } from "react";

type EncryptedTextProps = {
  text: string;
  className?: string;
  revealDelayMs?: number;
  charset?: string;
  flipDelayMs?: number;
  encryptedClassName?: string;
  revealedClassName?: string;
};

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

const randomFromCharset = (charset: string) => charset[Math.floor(Math.random() * charset.length)] ?? "?";
const deterministicFromCharset = (charset: string, key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return charset[hash % charset.length] ?? "?";
};

export function EncryptedText({
  text,
  className = "",
  revealDelayMs = 50,
  charset = DEFAULT_CHARSET,
  flipDelayMs = 50,
  encryptedClassName = "text-[var(--text-muted)]",
  revealedClassName = "text-[var(--text-primary)]",
}: EncryptedTextProps) {
  const safeCharset = useMemo(() => (charset.length > 0 ? charset : DEFAULT_CHARSET), [charset]);

  const initialDisplay = useMemo(
    () =>
      Array.from({ length: text.length }, (_, index) =>
        text[index] === " " ? " " : deterministicFromCharset(safeCharset, `${text}-${index}`),
      ),
    [safeCharset, text],
  );

  const [revealedCount, setRevealedCount] = useState(0);
  const [displayChars, setDisplayChars] = useState<string[]>(initialDisplay);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setRevealedCount(0);
      setDisplayChars(initialDisplay);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [initialDisplay, text]);

  useEffect(() => {
    const revealTimer = window.setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= text.length) {
          window.clearInterval(revealTimer);
          return prev;
        }
        return prev + 1;
      });
    }, revealDelayMs);

    return () => window.clearInterval(revealTimer);
  }, [revealDelayMs, text.length]);

  useEffect(() => {
    const flipTimer = window.setInterval(() => {
      setDisplayChars((prev) =>
        prev.map((char, index) => {
          if (index < revealedCount) return text[index] ?? "";
          if (text[index] === " ") return " ";
          return randomFromCharset(safeCharset);
        }),
      );
    }, flipDelayMs);

    return () => window.clearInterval(flipTimer);
  }, [flipDelayMs, revealedCount, safeCharset, text]);

  return (
    <span className={className}>
      {displayChars.map((char, index) => {
        const isRevealed = index < revealedCount;
        return (
          <span key={`${index}-${char}`} className={isRevealed ? revealedClassName : encryptedClassName}>
            {isRevealed ? text[index] : char}
          </span>
        );
      })}
    </span>
  );
}
