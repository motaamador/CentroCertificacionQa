// src/app/api/connectivity/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check");
  const host = searchParams.get("host") || "google.com";
  const port = searchParams.get("port") || "443";

  const safeHost = host.replace(/[^a-zA-Z0-9.\-_:/]/g, "");
  // Always build a valid URL with protocol
  const baseHost = safeHost.replace(/^https?:\/\//, "");
  const url = `https://${baseHost}`;

  try {
    switch (check) {
      case "ping": {
        const times = [];
        let failed = 0;
        for (let i = 0; i < 3; i++) {
          const start = Date.now();
          try {
            await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(4000) });
            times.push(Date.now() - start);
          } catch {
            failed++;
          }
        }

        if (failed === 3) {
          return Response.json({
            status: "fail",
            message: `Host ${baseHost} no responde`,
            details: ["3/3 intentos fallidos", "Host posiblemente caído o sin red"]
          });
        }

        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const loss = Math.round((failed / 3) * 100);
        const status = avg < 200 && loss === 0 ? "pass" : loss > 0 ? "warn" : "pass";

        return Response.json({
          status,
          message: `Ping a ${baseHost}: ${avg}ms avg`,
          latency: avg,
          details: [
            `Latencia avg: ${avg}ms`,
            `Pérdida de paquetes: ${loss}%`,
            times.map((t, i) => `Intento ${i + 1}: ${t}ms`).join(", "),
            avg < 50 ? "Excelente" : avg < 200 ? "Bueno" : "Lento"
          ]
        });
      }

      case "dns": {
        const start = Date.now();
        try {
          await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5000) });
          const latency = Date.now() - start;
          return Response.json({
            status: "pass",
            message: `DNS resuelto para ${baseHost}`,
            latency,
            details: [`Host: ${baseHost}`, `Resolución: ${latency}ms`, "IP resolvida correctamente"]
          });
        } catch (err) {
          return Response.json({
            status: "fail",
            message: `DNS falla para ${baseHost}`,
            details: [`Error: ${err.message}`, "Posible falla de DNS o host inexistente"]
          });
        }
      }

      case "ssl": {
        if (!baseHost.includes("localhost") && !baseHost.startsWith("127")) {
          try {
            const start = Date.now();
            const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
            const latency = Date.now() - start;
            const hsts = res.headers.get("strict-transport-security");

            return Response.json({
              status: hsts ? "pass" : "warn",
              message: hsts ? "SSL/TLS válido con HSTS" : "SSL válido pero sin HSTS",
              latency,
              details: [
                "TLS: Activo y válido",
                `HTTP Status: ${res.status}`,
                hsts ? `HSTS: ${hsts}` : "HSTS: No configurado (recomendado)",
                `Tiempo de handshake: ~${latency}ms`
              ]
            });
          } catch (err) {
            return Response.json({
              status: "fail",
              message: `SSL/TLS error: ${err.message}`,
              details: [`Error: ${err.message}`, "Certificado inválido o expirado"]
            });
          }
        } else {
          return Response.json({
            status: "warn",
            message: "Localhost — SSL no aplicable en dev",
            details: ["En producción usa siempre HTTPS", "Configura Let's Encrypt o cert propio"]
          });
        }
      }

      case "http": {
        try {
          const start = Date.now();
          const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
          const latency = Date.now() - start;
          const ok = res.status >= 200 && res.status < 400;

          return Response.json({
            status: ok ? "pass" : "fail",
            message: `HTTP ${res.status} — ${ok ? "servicio activo" : "servicio con error"}`,
            latency,
            details: [
              `Status: ${res.status} ${res.statusText}`,
              `Latencia: ${latency}ms`,
              `Content-Type: ${res.headers.get("content-type") || "no especificado"}`,
              `Server: ${res.headers.get("server") || "no expuesto"}`
            ]
          });
        } catch (err) {
          return Response.json({
            status: "fail",
            message: `HTTP error: ${err.message}`,
            details: [`Error: ${err.message}`, "El servicio no responde"]
          });
        }
      }

      default:
        return Response.json({ status: "fail", message: "Check desconocido" }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ status: "fail", message: `Error interno: ${err.message}`, details: [] });
  }
}
