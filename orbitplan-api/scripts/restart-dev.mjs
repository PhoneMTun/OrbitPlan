import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT ?? 4000);

const parseWindowsPids = (stdout, targetPort) => {
  const pids = new Set();
  const lines = stdout.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.includes("LISTENING")) continue;
    if (!line.includes(`:${targetPort}`)) continue;

    const parts = line.split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  return [...pids];
};

const parseUnixPids = (stdout) =>
  stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));

const getListeningPids = async (targetPort) => {
  if (process.platform === "win32") {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
    return parseWindowsPids(stdout, targetPort);
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-ti", `tcp:${targetPort}`, "-sTCP:LISTEN"]);
    return parseUnixPids(stdout);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) {
      return [];
    }
    throw error;
  }
};

const killPid = async (pid) => {
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/F", "/PID", pid]);
    return;
  }

  process.kill(Number(pid), "SIGKILL");
};

const stopExistingServer = async () => {
  const pids = await getListeningPids(port);
  if (pids.length === 0) return;

  for (const pid of pids) {
    console.log(`Stopping process ${pid} on port ${port}...`);
    await killPid(pid);
  }
};

const startDevServer = () => {
  const command = process.platform === "win32" ? "tsx.cmd" : "tsx";
  const child = spawn(command, ["watch", "src/server.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
};

try {
  await stopExistingServer();
  startDevServer();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to restart dev server");
  process.exit(1);
}
