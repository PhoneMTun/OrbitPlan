/**
 * Lightweight structured logs for the API (no extra deps).
 * Set LOG_LEVEL=debug|info|warn|error (default: debug in dev, info in production).
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = (): Level => {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (fromEnv === "debug" || fromEnv === "info" || fromEnv === "warn" || fromEnv === "error") {
    return fromEnv;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

const shouldLog = (level: Level): boolean => LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];

const emit = (level: Level, event: string, data?: Record<string, unknown>) => {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "orbitplan-api",
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => emit("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
