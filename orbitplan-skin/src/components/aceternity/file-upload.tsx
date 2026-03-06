"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { motion } from "framer-motion";

type FileUploadProps = {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept?: string;
};

const GRID_ROWS = 6;
const GRID_COLS = 18;

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUpload({ onFileSelect, selectedFile, accept = ".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/*" }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => inputRef.current?.click();

  const onDropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFileSelect(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="w-full" onDragOver={(event) => event.preventDefault()}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDropFile}
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
        animate={{
          borderColor: isDragging ? "rgba(108,242,255,0.72)" : "rgba(95,124,255,0.34)",
          boxShadow: isDragging ? "0 0 0 3px rgba(108,242,255,0.22)" : "0 0 0 0 rgba(0,0,0,0)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        />

        <div className="pointer-events-none absolute inset-0 opacity-55 [mask-image:radial-gradient(ellipse_at_center,white,transparent_78%)]">
          <div className="grid h-full w-full grid-cols-[repeat(18,minmax(0,1fr))] gap-[2px]">
            {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, index) => (
              <div
                key={index}
                className={
                  index % 2 === 0
                    ? "h-7 rounded-[2px] bg-[rgba(39,53,108,0.58)]"
                    : "h-7 rounded-[2px] bg-[rgba(10,14,40,0.82)]"
                }
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex min-h-48 flex-col items-center justify-center gap-2 text-center">
          <motion.div
            initial={false}
            animate={{ y: isDragging ? -2 : 0 }}
            className="rounded-xl border border-[var(--border)] bg-[rgba(7,10,28,0.9)] p-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6 text-[var(--accent)]"
              aria-hidden
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5" />
            </svg>
          </motion.div>

          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Drag and drop your meeting file here
          </p>
          <p className="text-xs text-[var(--text-secondary)]">or click to upload MP3, WAV, M4A, MP4, WEBM</p>

          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-[rgba(7,10,28,0.88)] px-4 py-3 text-left"
            >
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(selectedFile.size)}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
