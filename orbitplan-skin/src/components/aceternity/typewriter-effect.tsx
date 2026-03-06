"use client";

import { useEffect, useMemo, useState } from "react";

type TypewriterEffectProps = {
  phrases: string[];
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  holdMs?: number;
  className?: string;
};

export function TypewriterEffect({
  phrases,
  typingSpeedMs = 64,
  deletingSpeedMs = 36,
  holdMs = 1300,
  className = "",
}: TypewriterEffectProps) {
  const safePhrases = useMemo(() => (phrases.length > 0 ? phrases : [""]), [phrases]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = safePhrases[phraseIndex % safePhrases.length];

    if (!isDeleting && text === currentPhrase) {
      const holdTimer = window.setTimeout(() => setIsDeleting(true), holdMs);
      return () => window.clearTimeout(holdTimer);
    }

    if (isDeleting && text === "") {
      const nextTimer = window.setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % safePhrases.length);
      }, 0);
      return () => window.clearTimeout(nextTimer);
    }

    const nextText = isDeleting
      ? currentPhrase.slice(0, Math.max(0, text.length - 1))
      : currentPhrase.slice(0, Math.min(currentPhrase.length, text.length + 1));

    const timer = window.setTimeout(
      () => setText(nextText),
      isDeleting ? deletingSpeedMs : typingSpeedMs,
    );

    return () => window.clearTimeout(timer);
  }, [deletingSpeedMs, holdMs, isDeleting, phraseIndex, safePhrases, text, typingSpeedMs]);

  return (
    <p className={className}>
      {text}
      <span className="typewriter-cursor" aria-hidden>
        |
      </span>
    </p>
  );
}
