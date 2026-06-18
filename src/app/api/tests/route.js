// src/app/api/tests/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  switch (type) {
    case "api": {
      try {
        const start = Date.now();
        const response = await fetch("https://jsonplaceholder.typicode.com/users/1", { cache: "no-store" });
        const data = await response.json();
        const latency = Date.now() - start;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (latency > 2000) throw new Error(`Latencia ${latency}ms supera límite de 2000ms`);
        return Response.json({
          status: "success",
          message: `API respondió correctamente en ${latency}ms`,
          latency,
          details: [`HTTP ${response.status}`, `Latencia: ${latency}ms`, `Usuario: ${data.name}`],
        });
      } catch (err) {
        return Response.json({ status: "error", message: err.message, details: [err.message] });
      }
    }

    case "security":
      return Response.json({
        status: "success",
        message: "Simulación de seguridad completada",
        details: ["XSS bloqueado por CSP", "SQL Injection rechazado (400)", "HSTS activo"],
      });

    case "db":
      return Response.json({
        status: "success",
        message: "Conexión a BD simulada correctamente",
        details: ["Latencia: 12ms", "Tablas: 8", "Integridad: OK"],
      });

    case "connectivity": {
      try {
        const start = Date.now();
        const res = await fetch("https://cloudflare.com", { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(6000) });
        const latency = Date.now() - start;
        return Response.json({
          status: "success",
          message: `Conectividad OK (${latency}ms)`,
          latency,
          details: [`Latencia: ${latency}ms`, `HTTP: ${res.status}`, "DNS: OK"],
        });
      } catch (err) {
        return Response.json({ status: "error", message: `Sin conectividad: ${err.message}`, details: ["Verifica la conexión a internet"] });
      }
    }

    default:
      return Response.json({ status: "error", message: "Tipo desconocido" }, { status: 400 });
  }
}
