// src/app/api/nettools/route.js
// Server-side network diagnostics: traceroute, nslookup, dig, nc (port check)

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Allowed binaries and their absolute paths
const TOOLS = {
  traceroute: "/usr/sbin/traceroute",
  nslookup:   "/usr/bin/nslookup",
  dig:        "/usr/bin/dig",
  nc:         "/usr/bin/nc",
  ping:       "/usr/bin/ping",
};

// Validate host — only allow safe hostnames/IPs
function validateHost(host) {
  if (!host || typeof host !== "string") throw new Error("Host requerido");
  const clean = host.trim();
  if (clean.length > 253) throw new Error("Host demasiado largo");
  // Allow: hostname chars, dots, hyphens, digits — no shell chars
  if (!/^[a-zA-Z0-9.\-_]+$/.test(clean)) throw new Error(`Host inválido: "${clean}"`);
  return clean;
}

function validatePort(port) {
  const n = parseInt(port, 10);
  if (isNaN(n) || n < 1 || n > 65535) throw new Error("Puerto debe estar entre 1 y 65535");
  return n;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tool   = searchParams.get("tool");
  const host   = searchParams.get("host");
  const port   = searchParams.get("port") || "80";
  const extra  = searchParams.get("extra") || ""; // e.g. DNS record type for dig

  if (!TOOLS[tool]) {
    return Response.json({ status: "fail", message: `Herramienta desconocida: ${tool}` }, { status: 400 });
  }

  let safeHost, safePort;
  try {
    safeHost = validateHost(host);
    if (tool === "nc") safePort = validatePort(port);
  } catch (e) {
    return Response.json({ status: "fail", message: e.message });
  }

  const start = Date.now();
  let stdout = "", stderr = "", exitCode = 0;

  try {
    let args = [];

    switch (tool) {
      case "traceroute":
        // -n: no reverse DNS (faster), -w 2: 2s timeout per hop, -m 20: max 20 hops
        args = ["-n", "-w", "2", "-m", "20", safeHost];
        break;

      case "nslookup":
        args = [safeHost];
        break;

      case "dig":
        // extra = record type: A, MX, CNAME, TXT, etc.
        const recordType = /^[A-Z]{1,10}$/.test(extra.toUpperCase()) ? extra.toUpperCase() : "A";
        args = [safeHost, recordType, "+short", "+tries=2", "+time=5"];
        break;

      case "nc":
        // -z: scan only (no data), -v: verbose, -w 5: timeout 5s
        args = ["-z", "-v", "-w", "5", safeHost, String(safePort)];
        break;

      case "ping":
        // -c 4: 4 packets, -W 3: 3s timeout per packet
        args = ["-c", "4", "-W", "3", safeHost];
        break;
    }

    const result = await execFileAsync(TOOLS[tool], args, {
      timeout: 30000,
      maxBuffer: 512 * 1024,
      env: { PATH: process.env.PATH },
    });

    stdout = result.stdout || "";
    stderr = result.stderr || "";

  } catch (execErr) {
    stdout   = execErr.stdout || "";
    stderr   = execErr.stderr || execErr.message;
    exitCode = execErr.code   || 1;
  }

  const latency = Date.now() - start;

  // nc outputs to stderr — move it to stdout for display
  const output = stdout || stderr;

  // Parse traceroute output into structured hops
  let hops = null;
  if (tool === "traceroute" && output) {
    hops = output
      .split("\n")
      .filter(line => /^\s*\d+/.test(line))
      .map(line => {
        const hop = line.trim().match(/^(\d+)\s+(.+)$/);
        return hop ? { hop: hop[1], info: hop[2].trim() } : null;
      })
      .filter(Boolean);
  }

  // Parse ping output for stats
  let pingStats = null;
  if (tool === "ping" && output) {
    const statsLine = output.match(/(\d+) packets transmitted, (\d+) received.*?(\d+(?:\.\d+)?\/\d+(?:\.\d+)?\/\d+(?:\.\d+)?\/\d+(?:\.\d+)?) ms/);
    if (statsLine) {
      const [min, avg, max] = statsLine[3].split("/");
      pingStats = {
        sent: statsLine[1], received: statsLine[2],
        loss: `${Math.round((1 - statsLine[2] / statsLine[1]) * 100)}%`,
        min: `${min}ms`, avg: `${avg}ms`, max: `${max}ms`
      };
    }
  }

  const pass = exitCode === 0 || (tool === "nc" && stderr.includes("succeeded"));

  return Response.json({
    status: pass ? "pass" : "fail",
    message: pass
      ? `✅ ${tool} completado en ${latency}ms`
      : `❌ ${tool} falló (exit: ${exitCode}) — ${latency}ms`,
    latency,
    exitCode,
    output,
    hops,
    pingStats,
    tool,
    host: safeHost,
  });
}
