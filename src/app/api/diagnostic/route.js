// src/app/api/diagnostic/route.js
// Diagnóstico completo de un host: ping, traceroute, puertos, red, recomendaciones

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const TOOLS = {
  ping:       "/usr/bin/ping",
  traceroute: "/usr/sbin/traceroute",
  nc:         "/usr/bin/nc",
};

// Servicios conocidos por puerto
const PORT_SERVICES = {
  21:    "FTP",        22:    "SSH",          23:  "Telnet",
  25:    "SMTP",       53:    "DNS",           80:  "HTTP",
  110:   "POP3",       143:   "IMAP",         443: "HTTPS",
  1433:  "MSSQL",     3000:  "Node.js/API",  3306: "MySQL",
  5432:  "PostgreSQL", 5900:  "VNC",          6379: "Redis",
  7000:  "App",        8000:  "Dev HTTP",     8080: "HTTP-Alt",
  8443:  "HTTPS-Alt",  8888:  "Dev Server",   9000: "PHP/App",
  9090:  "Prometheus", 27017: "MongoDB",
};

const SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443,
  1433, 3000, 3306, 5432, 5900, 6379, 8000, 8080, 8443, 8888, 9000, 27017];

function validateHost(host) {
  if (!host || typeof host !== "string") throw new Error("Host requerido");
  const clean = host.trim();
  if (!/^[a-zA-Z0-9.\-_]+$/.test(clean)) throw new Error(`Host inválido: "${clean}"`);
  return clean;
}

// ── Ping ──────────────────────────────────────────────────────────────────
async function runPing(host) {
  try {
    const { stdout } = await execFileAsync(TOOLS.ping, ["-c", "4", "-W", "2", host], {
      timeout: 12000, env: { PATH: process.env.PATH }
    });
    const stats  = stdout.match(/(\d+) packets transmitted, (\d+) received.*?([\d.]+)% packet loss/);
    const rtt    = stdout.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
    return {
      reachable: stats ? parseInt(stats[2]) > 0 : false,
      sent:      stats ? parseInt(stats[1]) : 4,
      received:  stats ? parseInt(stats[2]) : 0,
      loss:      stats ? stats[3] + "%" : "100%",
      min:       rtt   ? rtt[1] + "ms" : null,
      avg:       rtt   ? rtt[2] + "ms" : null,
      max:       rtt   ? rtt[3] + "ms" : null,
    };
  } catch {
    return { reachable: false, sent: 4, received: 0, loss: "100%", min: null, avg: null, max: null };
  }
}

// ── Traceroute ────────────────────────────────────────────────────────────
async function runTraceroute(host) {
  try {
    const { stdout } = await execFileAsync(
      TOOLS.traceroute, ["-n", "-w", "2", "-m", "15", host],
      { timeout: 20000, env: { PATH: process.env.PATH } }
    );
    const hops = stdout.split("\n")
      .filter(l => /^\s*\d+/.test(l))
      .map(l => {
        const m = l.trim().match(/^(\d+)\s+(.+)$/);
        return m ? { hop: parseInt(m[1]), info: m[2].trim() } : null;
      }).filter(Boolean);
    return { hops, totalHops: hops.length };
  } catch {
    return { hops: [], totalHops: 0 };
  }
}

// ── Port scan (paralelo) ──────────────────────────────────────────────────
async function scanPorts(host) {
  const results = await Promise.allSettled(
    SCAN_PORTS.map(async port => {
      try {
        await execFileAsync(TOOLS.nc, ["-z", "-w", "1", host, String(port)], {
          timeout: 3000, env: { PATH: process.env.PATH }
        });
        return { port, open: true, service: PORT_SERVICES[port] || "Desconocido" };
      } catch {
        return { port, open: false, service: PORT_SERVICES[port] || "Desconocido" };
      }
    })
  );
  return results.map(r => r.status === "fulfilled" ? r.value : { port: 0, open: false });
}

// ── Info de red local ─────────────────────────────────────────────────────
async function getNetworkInfo(targetHost) {
  try {
    const { stdout } = await execFileAsync("ip", ["route", "show"], {
      timeout: 3000, env: { PATH: process.env.PATH }
    });
    const lines   = stdout.split("\n");
    const defLine = lines.find(l => l.startsWith("default"));
    const gateway = defLine?.match(/via ([\d.]+)/)?.[1] || null;
    const localLine = lines.find(l => l.includes("src") && !l.startsWith("default"));
    const localIP   = localLine?.match(/src ([\d.]+)/)?.[1] || null;
    const localNet  = localLine?.match(/^([\d.]+\/\d+)/)?.[1] || null;

    // Detectar si target está en misma subred
    let sameSubnet = false;
    if (localIP && targetHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      const localParts  = localIP.split(".").slice(0, 3).join(".");
      const targetParts = targetHost.split(".").slice(0, 3).join(".");
      sameSubnet = localParts === targetParts;
    }

    return { localIP, gateway, localNet, sameSubnet };
  } catch {
    return { localIP: null, gateway: null, localNet: null, sameSubnet: false };
  }
}

// ── Generar recomendaciones ───────────────────────────────────────────────
function generateRecommendations(ping, ports, network) {
  const recs = [];
  const openPorts = ports.filter(p => p.open);

  if (!ping.reachable) {
    recs.push({ type: "error",   text: "Host inaccesible — verifica que esté encendido y conectado" });
    return recs;
  }

  if (!network.sameSubnet) {
    recs.push({ type: "warn", text: `Redes distintas — el tráfico pasa por gateway (${network.gateway || "?"})` });
    recs.push({ type: "info", text: "Verifica que no haya reglas de firewall bloqueando entre subredes" });
  } else {
    recs.push({ type: "ok",  text: "Mismo segmento de red — comunicación directa sin routing" });
  }

  if (openPorts.find(p => p.port === 443)) {
    recs.push({ type: "ok",  text: "HTTPS disponible en puerto 443" });
  } else if (openPorts.find(p => p.port === 80)) {
    recs.push({ type: "warn", text: "Solo HTTP disponible (sin HTTPS) — comunicación no cifrada" });
  }

  if (openPorts.find(p => p.port === 22)) {
    recs.push({ type: "ok",  text: "SSH disponible — acceso remoto seguro operativo" });
  }

  if (openPorts.find(p => p.port === 5432)) {
    recs.push({ type: "warn", text: "PostgreSQL expuesto en la red — verifica que tenga autenticación fuerte" });
  }

  if (openPorts.find(p => p.port === 3306)) {
    recs.push({ type: "warn", text: "MySQL expuesto en la red — verifica acceso restringido" });
  }

  if (openPorts.find(p => p.port === 23)) {
    recs.push({ type: "error", text: "Telnet abierto — protocolo inseguro, reemplazar por SSH" });
  }

  if (openPorts.length === 0) {
    recs.push({ type: "warn", text: "Ningún puerto estándar abierto — puede tener firewall restrictivo" });
  } else {
    recs.push({ type: "info", text: `${openPorts.length} servicio(s) detectado(s): ${openPorts.map(p => p.service).join(", ")}` });
  }

  const avgMs = parseFloat(ping.avg);
  if (!isNaN(avgMs)) {
    if (avgMs < 5)   recs.push({ type: "ok",   text: `Latencia excelente: ${ping.avg} (red local directa)` });
    else if (avgMs < 50) recs.push({ type: "ok",   text: `Latencia buena: ${ping.avg}` });
    else if (avgMs < 200) recs.push({ type: "warn", text: `Latencia elevada: ${ping.avg} — revisar carga de red` });
    else recs.push({ type: "error", text: `Latencia crítica: ${ping.avg} — posible problema de red` });
  }

  return recs;
}

// ── Handler principal ─────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawHost = searchParams.get("host");

  let host;
  try { host = validateHost(rawHost); }
  catch (e) { return Response.json({ status: "fail", message: e.message }, { status: 400 }); }

  const start = Date.now();

  // Ejecutar ping, traceroute y escaneo de puertos EN PARALELO
  const [ping, trace, ports, network] = await Promise.all([
    runPing(host),
    runTraceroute(host),
    scanPorts(host),
    getNetworkInfo(host),
  ]);

  const openPorts = ports.filter(p => p.open);
  const recommendations = generateRecommendations(ping, ports, network);
  const duration = Date.now() - start;

  return Response.json({
    status:  ping.reachable ? "pass" : "fail",
    message: ping.reachable
      ? `✅ ${host} alcanzable — ${openPorts.length} puertos abiertos · ${duration}ms`
      : `❌ ${host} no responde al ping`,
    host,
    duration,
    ping,
    trace,
    ports,
    openPorts,
    network,
    recommendations,
  });
}
