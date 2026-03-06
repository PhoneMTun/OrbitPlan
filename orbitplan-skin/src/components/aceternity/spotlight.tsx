"use client";

import { motion } from "framer-motion";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export function Spotlight({ className = "", fill = "white" }: SpotlightProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: -80, y: -80 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`pointer-events-none absolute ${className}`}
      aria-hidden
    >
      <svg width="560" height="560" viewBox="0 0 560 560" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_f_39_4212)">
          <circle cx="280" cy="280" r="120" fill={fill} fillOpacity="0.22" />
        </g>
        <defs>
          <filter
            id="filter0_f_39_4212"
            x="0"
            y="0"
            width="560"
            height="560"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="80" result="effect1_foregroundBlur_39_4212" />
          </filter>
        </defs>
      </svg>
    </motion.div>
  );
}
