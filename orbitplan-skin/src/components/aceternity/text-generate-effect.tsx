"use client";

import { motion } from "framer-motion";

type TextGenerateEffectProps = {
  words: string;
  className?: string;
  delay?: number;
  stagger?: number;
};

export function TextGenerateEffect({ words, className = "", delay = 0, stagger = 0.035 }: TextGenerateEffectProps) {
  const wordArray = words.split(" ");

  return (
    <div className={className}>
      {wordArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          initial={{ opacity: 0, filter: "blur(6px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.45,
            delay: delay + idx * stagger,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="mr-2 inline-block"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
