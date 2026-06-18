// src/app/api/curl/route.js
// Executes curl commands server-side with strict sanitization

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Characters/patterns that are never allowed
const BLOCKED_PATTERNS = [
  /;/,           // command chaining
  /&&/,          // AND chaining
  /\|\|/,        // OR chaining
  /`/,           // backtick execution
  /\$\(/,        // $(...) subshell
  /\$\{/,        // ${...} variable expansion
  />/,           // output redirect
  /</,           // input redirect
  /\bsudo\b/,    // privilege escalation
  /\brm\b/,      // delete files
  /\bmv\b/,      // move files
  /\bcp\b/,      // copy commands
  /\bchmod\b/,   // permission changes
  /\bchown\b/,   // ownership changes
  /\beval\b/,    // eval execution
  /\bexec\b/,    // exec
  /127\.0\.0\.1.*:\s*[0-9]{1,4}[^5]/, // block low ports except common web ports
];

// Parse a curl command string into [executable, ...args]
function parseCurlCommand(raw) {
  const trimmed = raw.trim();

  // Must start with "curl"
  if (!/^curl(\s|$)/i.test(trimmed)) {
    throw new Error("El comando debe comenzar con 'curl'");
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error(`Comando bloqueado por seguridad: contiene patrón no permitido (${pattern})`);
    }
  }

  // Simple shell-aware arg tokenizer (handles "quoted strings" and 'single quotes')
  const args = [];
  let current = "";
  let inDouble = false;
  let inSingle = false;
  let i = 0;

  // Skip the leading "curl"
  const rest = trimmed.slice(4).trim();

  for (i = 0; i < rest.length; i++) {
    const ch = rest[i];

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === " " && !inDouble && !inSingle) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) args.push(current);

  if (inDouble || inSingle) {
    throw new Error("Comillas sin cerrar en el comando");
  }

  return args;
}

export async function POST(request) {
  try {
    const { command, timeoutMs = 15000 } = await request.json();

    if (!command?.trim()) {
      return Response.json({ status: "fail", message: "Comando requerido" }, { status: 400 });
    }

    // Parse and validate
    let args;
    try {
      args = parseCurlCommand(command.trim());
    } catch (parseErr) {
      return Response.json({
        status: "fail",
        message: parseErr.message,
        stdout: "",
        stderr: parseErr.message,
      });
    }

    // Always add -s (silent) and --max-time to prevent hanging
    const maxSecs = Math.min(Math.ceil(timeoutMs / 1000), 30);
    if (!args.includes("-s") && !args.includes("--silent")) {
      args.unshift("-s");
    }
    if (!args.some(a => a.startsWith("--max-time") || a === "-m")) {
      args.push("--max-time", String(maxSecs));
    }

    const start = Date.now();

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const result = await execFileAsync("curl", args, {
        timeout: timeoutMs + 2000,
        maxBuffer: 1024 * 1024, // 1MB max output
        env: { PATH: process.env.PATH }, // minimal env
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execErr) {
      stdout = execErr.stdout || "";
      stderr = execErr.stderr || execErr.message;
      exitCode = execErr.code || 1;
    }

    const latency = Date.now() - start;

    // Try to pretty-print JSON response
    let prettyOutput = stdout;
    try {
      const parsed = JSON.parse(stdout);
      prettyOutput = JSON.stringify(parsed, null, 2);
    } catch {}

    // Reconstruct the exact command that was run (for display)
    const executedCommand = `curl ${args.join(" ")}`;

    return Response.json({
      status: exitCode === 0 ? "pass" : "fail",
      message: exitCode === 0
        ? `✅ Ejecutado en ${latency}ms (exit: 0)`
        : `❌ Error (exit: ${exitCode}) — ${latency}ms`,
      latency,
      exitCode,
      stdout: prettyOutput,
      stderr,
      executedCommand,
      outputLines: prettyOutput.split("\n").length,
    });
  } catch (err) {
    return Response.json(
      { status: "fail", message: `Error interno: ${err.message}` },
      { status: 500 }
    );
  }
}
