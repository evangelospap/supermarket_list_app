import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

const processes = [
  {
    command: "npm",
    args: ["run", "dev:backend"],
    label: "backend",
  },
  {
    command: "npm",
    args: ["run", "dev"],
    label: "frontend",
  },
].map(({ args, command, label }) => {
  const child = spawn(isWindows ? "cmd.exe" : command, isWindows ? ["/d", "/s", "/c", command, ...args] : args, {
    stdio: "pipe",
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(prefixLines(label, chunk));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(prefixLines(label, chunk));
  });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    console.log(`[${label}] exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  });

  return child;
});

let isShuttingDown = false;

function prefixLines(label, chunk) {
  return String(chunk)
    .split(/(\r?\n)/)
    .map((part) => (part.trim() && part !== "\n" && part !== "\r\n" ? `[${label}] ${part}` : part))
    .join("");
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
