// src/app/api/proxy/route.js
// Proxies HTTP requests server-side to avoid CORS issues

export async function POST(request) {
  try {
    const { url, options = {}, assertStatus = 200, assertMaxMs = 2000 } = await request.json();

    if (!url) {
      return Response.json({ status: "fail", message: "URL requerida" }, { status: 400 });
    }

    const start = Date.now();

    const fetchOptions = {
      method: options.method || "GET",
      headers: options.headers || {},
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    };

    if (options.body && ["POST", "PUT", "PATCH"].includes(fetchOptions.method)) {
      fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (err) {
      return Response.json({
        status: "fail",
        message: `No se pudo conectar: ${err.message}`,
        latency: Date.now() - start,
        details: [`Error: ${err.message}`, `URL: ${url}`],
      });
    }

    const latency = Date.now() - start;

    let responseBody;
    const contentType = response.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        responseBody = await response.json();
      } else {
        const text = await response.text();
        responseBody = text.slice(0, 2000); // Limit response body size
      }
    } catch {
      responseBody = null;
    }

    // Evaluate assertions
    const statusOk = response.status === assertStatus || (assertStatus === 200 && response.ok);
    const latencyOk = latency <= assertMaxMs;
    const pass = statusOk && latencyOk;

    const details = [
      `HTTP Status: ${response.status} ${response.statusText}`,
      `Latencia: ${latency}ms`,
      `Método: ${fetchOptions.method}`,
      `URL: ${url}`,
    ];

    if (!statusOk) details.push(`⚠ Esperado HTTP ${assertStatus}, recibido ${response.status}`);
    if (!latencyOk) details.push(`⚠ Latencia ${latency}ms supera límite de ${assertMaxMs}ms`);

    // Include some response headers
    const importantHeaders = ["content-type", "x-powered-by", "server", "cache-control"];
    importantHeaders.forEach(h => {
      const val = response.headers.get(h);
      if (val) details.push(`Header ${h}: ${val}`);
    });

    return Response.json({
      status: pass ? "pass" : "fail",
      message: pass
        ? `✅ Prueba exitosa — HTTP ${response.status}, ${latency}ms`
        : `❌ Prueba fallida — HTTP ${response.status}, ${latency}ms`,
      latency,
      httpStatus: response.status,
      details,
      responseBody,
    });
  } catch (err) {
    return Response.json({ status: "fail", message: `Error interno: ${err.message}` }, { status: 500 });
  }
}
