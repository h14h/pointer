// Dev server launcher: `bun run dev [-- <flags>]`.
//
// Thin translator in front of `vite dev` so launch commands written for the
// old Next.js CLI keep working (Tidewave's dev-command config, muscle
// memory):
//
//   Next flag                       → Vite equivalent
//   --hostname <host>               → --host <host>
//   --port <port>                   → --port <port> --strictPort (a supervisor
//                                     asking for a port means "exactly there")
//   --experimental-https            → dropped (implied by the cert flags)
//   --experimental-https-key <file> → TIDEWAVE_HTTPS_KEY env (vite.config.ts
//                                     turns key+cert into server.https)
//   --experimental-https-cert <f>   → TIDEWAVE_HTTPS_CERT env
//   --turbopack                     → dropped
//
// Native Vite flags (--host, --port, --strictPort, …) pass through untouched.
// HTTPS can also be configured without flags via TIDEWAVE_HTTPS_KEY/CERT in
// the environment or .env.local. See .env.example.

import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const viteArgs: string[] = [];
const env = { ...process.env };
let sawExplicitPort = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--hostname":
      viteArgs.push("--host", args[++i] ?? "");
      break;
    case "--port":
    case "-p":
      viteArgs.push("--port", args[++i] ?? "");
      sawExplicitPort = true;
      break;
    case "--experimental-https":
    case "--turbopack":
      break; // no-op under Vite
    case "--experimental-https-key":
      env.TIDEWAVE_HTTPS_KEY = args[++i] ?? "";
      break;
    case "--experimental-https-cert":
      env.TIDEWAVE_HTTPS_CERT = args[++i] ?? "";
      break;
    default:
      viteArgs.push(arg);
  }
}

if (sawExplicitPort && !viteArgs.includes("--strictPort")) {
  viteArgs.push("--strictPort");
}

const child = spawn("bunx", ["vite", "dev", ...viteArgs], {
  stdio: "inherit",
  env,
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
