// src/app/api/security/route.js

const SECURITY_HEADERS = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check");
  const targetUrl = searchParams.get("url") || "https://example.com";

  // Ensure URL has protocol
  const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

  try {
    switch (check) {
      case "headers": {
        let headers = {};
        try {
          const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
          headers = Object.fromEntries(res.headers.entries());
        } catch {
          return Response.json({ status: "fail", message: "No se pudo conectar al target", findings: [{ message: "Host inaccesible", severity: "critical" }] });
        }

        const findings = [];
        let hasIssue = false;

        SECURITY_HEADERS.forEach(h => {
          if (headers[h]) {
            findings.push({ message: `✓ ${h}: ${headers[h].slice(0, 60)}`, severity: "ok" });
          } else {
            findings.push({ message: `Missing header: ${h}`, severity: "warn" });
            hasIssue = true;
          }
        });

        return Response.json({
          status: hasIssue ? "warn" : "pass",
          message: hasIssue ? "Algunos security headers están ausentes" : "Todos los security headers presentes",
          findings
        });
      }

      case "cors": {
        let findings = [];
        let status = "pass";
        try {
          const res = await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
            headers: { "Origin": "https://evil.com" }
          });
          const acao = res.headers.get("access-control-allow-origin");
          if (acao === "*") {
            findings.push({ message: "CORS wildcard (*) detectado — cualquier origen puede acceder", severity: "critical" });
            status = "fail";
          } else if (acao) {
            findings.push({ message: `CORS restringido a: ${acao}`, severity: "ok" });
          } else {
            findings.push({ message: "No expone CORS — configuración correcta", severity: "ok" });
          }
        } catch {
          findings.push({ message: "No se pudo verificar CORS", severity: "warn" });
          status = "warn";
        }
        return Response.json({ status, message: status === "pass" ? "Configuración CORS segura" : "CORS permisivo detectado", findings });
      }

      case "ssl": {
        const hostname = new URL(url).hostname;
        let findings = [];
        let status = "pass";
        try {
          const res = await fetch(`https://${hostname}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
          findings.push({ message: `✓ SSL/TLS activo en ${hostname}`, severity: "ok" });
          findings.push({ message: `✓ HTTP ${res.status} con conexión HTTPS`, severity: "ok" });
          // Check HSTS
          const hsts = res.headers.get("strict-transport-security");
          if (hsts) {
            findings.push({ message: `✓ HSTS activo: ${hsts}`, severity: "ok" });
          } else {
            findings.push({ message: "HSTS no configurado", severity: "warn" });
            status = "warn";
          }
        } catch (err) {
          findings.push({ message: `SSL Error: ${err.message}`, severity: "critical" });
          status = "fail";
        }
        return Response.json({ status, message: status === "pass" ? "SSL/TLS válido" : "Problemas en SSL/TLS", findings });
      }

      case "injection": {
        const payloads = ["' OR '1'='1", "<script>alert(1)</script>", "1; DROP TABLE users--"];
        const findings = [];
        let status = "pass";
        for (const payload of payloads) {
          try {
            const testUrl = `${url}?q=${encodeURIComponent(payload)}`;
            const res = await fetch(testUrl, { cache: "no-store", signal: AbortSignal.timeout(5000) });
            if (res.status >= 200 && res.status < 300) {
              findings.push({ message: `Payload aceptado (no filtrado): ${payload.slice(0, 30)}`, severity: "warn" });
              status = "warn";
            } else {
              findings.push({ message: `Payload rechazado (${res.status}): ${payload.slice(0, 30)}`, severity: "ok" });
            }
          } catch {
            findings.push({ message: `Timeout/error con payload: ${payload.slice(0, 30)}`, severity: "ok" });
          }
        }
        return Response.json({ status, message: status === "pass" ? "Payloads maliciosos rechazados" : "Algunos payloads no fueron filtrados", findings });
      }

      case "ratelimit": {
        const REQUESTS = 5;
        const findings = [];
        let rateLimited = false;
        for (let i = 0; i < REQUESTS; i++) {
          try {
            const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
            if (res.status === 429) {
              rateLimited = true;
              findings.push({ message: `✓ Rate limit detectado en petición #${i + 1} (HTTP 429)`, severity: "ok" });
              break;
            } else {
              findings.push({ message: `Petición #${i + 1}: HTTP ${res.status}`, severity: "ok" });
            }
          } catch {
            break;
          }
        }
        if (!rateLimited) findings.push({ message: `Sin rate limiting detectado tras ${REQUESTS} peticiones`, severity: "warn" });
        return Response.json({
          status: rateLimited ? "pass" : "warn",
          message: rateLimited ? "Rate limiting activo" : "No se detectó rate limiting",
          findings
        });
      }

      default:
        return Response.json({ status: "fail", message: "Check desconocido" }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ status: "fail", message: `Error interno: ${err.message}`, findings: [] });
  }
}
