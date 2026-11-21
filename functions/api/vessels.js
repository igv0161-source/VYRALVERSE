const cors = {
  "Access-Control-Allow-Origin": "https://vyralverse.pages.dev",
  "Vary": "Origin",
  "Cache-Control": "no-store"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Cross-origin requests are not allowed." }, 403);
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);

  const apiKey = context.env && context.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    return json({
      status: "not_configured",
      error: "Live vessel tracking is not configured yet. The site owner must add AISSTREAM_API_KEY as a Cloudflare Pages secret."
    }, 503);
  }

  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return json({ error: "Valid map-centre latitude and longitude are required." }, 400);
  }

  if (request.headers.get("Upgrade") !== "websocket") {
    return json({ status: "ready", provider: "AISStream", message: "Server-side AIS proxy is configured." });
  }

  // Best-effort per-IP connection throttle to protect the upstream key.
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const cache = caches.default;
    const rateKey = new Request("https://vyralverse-rate-limit.invalid/ais/" + encodeURIComponent(ip));
    if (await cache.match(rateKey)) return json({ error: "Please wait before reconnecting to the vessel feed." }, 429);
    context.waitUntil(cache.put(rateKey, new Response("1", {
      headers: { "Cache-Control": "public, max-age=20" }
    })));
  } catch (_) {
    // Cache throttling is best-effort; provider-side limits still apply.
  }

  const latMin = Math.max(-90, lat - 5);
  const latMax = Math.min(90, lat + 5);
  const lonMin = Math.max(-180, lon - 5);
  const lonMax = Math.min(180, lon + 5);

  let upstream;
  try {
    const upstreamResponse = await fetch("https://stream.aisstream.io/v0/stream", {
      headers: { Upgrade: "websocket" }
    });
    upstream = upstreamResponse.webSocket;
    if (!upstream) {
      return json({ error: "AISStream did not accept the WebSocket connection.", providerStatus: upstreamResponse.status }, 502);
    }
    upstream.accept({ allowHalfOpen: true });
    upstream.send(JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [[[latMin, lonMin], [latMax, lonMax]]],
      FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport"]
    }));

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept({ allowHalfOpen: true });

    upstream.addEventListener("message", async event => {
      if (server.readyState !== WebSocket.OPEN) return;
      try {
        let payload = event.data;
        if (typeof payload !== "string") {
          if (payload instanceof ArrayBuffer) payload = new TextDecoder().decode(payload);
          else if (typeof Blob !== "undefined" && payload instanceof Blob) payload = await payload.text();
          else payload = String(payload);
        }
        if (server.readyState === WebSocket.OPEN) server.send(payload);
      } catch (_) {
        try { server.close(1011, "Could not relay AIS message"); } catch (_) {}
        try { upstream.close(1011, "Relay failed"); } catch (_) {}
      }
    });

    upstream.addEventListener("close", event => {
      try { if (server.readyState < WebSocket.CLOSING) server.close(event.code || 1000, "AISStream closed"); } catch (_) {}
    });
    upstream.addEventListener("error", () => {
      try { if (server.readyState < WebSocket.CLOSING) server.close(1011, "AISStream connection error"); } catch (_) {}
    });
    server.addEventListener("close", () => {
      try { if (upstream.readyState < WebSocket.CLOSING) upstream.close(1000, "Viewer disconnected"); } catch (_) {}
    });
    server.addEventListener("error", () => {
      try { if (upstream.readyState < WebSocket.CLOSING) upstream.close(1011, "Viewer connection error"); } catch (_) {}
    });

    return new Response(null, { status: 101, webSocket: client });
  } catch (error) {
    try { if (upstream && upstream.readyState < WebSocket.CLOSING) upstream.close(1011, "Proxy setup failed"); } catch (_) {}
    return json({ error: "Could not establish the AISStream connection.", detail: String(error && error.message || error) }, 502);
  }
}