const TTL_SECONDS = 3600;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? `public, max-age=600, s-maxage=${TTL_SECONDS}` : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Cross-origin request denied" }, 403);

  const cacheKey = new Request(new URL("/__vyralverse_cache/launches/recent-30d", url.origin));
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("X-Data-Cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }
  } catch (_) {}

  const end = new Date();
  end.setUTCSeconds(0, 0);
  const start = new Date(end.getTime() - 30 * 86400000);
  const upstreamUrl = new URL("https://ll.thespacedevs.com/2.3.0/launches/");
  upstreamUrl.searchParams.set("net__gte", start.toISOString());
  upstreamUrl.searchParams.set("net__lte", end.toISOString());
  upstreamUrl.searchParams.set("limit", "100");
  upstreamUrl.searchParams.set("mode", "detailed");

  let upstream;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "VYRALVERSE-GODSEYE/1.0 (public space-launch explorer)"
      },
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    return json({ error: "Launch Library 2 request failed", detail: String(error && error.message || error) }, 502);
  }
  if (!upstream.ok) return json({ error: "Launch Library 2 returned HTTP " + upstream.status }, 502, { "X-Upstream-Status": String(upstream.status) });

  const declaredLength = Number(upstream.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Launch Library 2 response exceeded the size limit" }, 502);
  const text = await upstream.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json({ error: "Launch Library 2 response exceeded the size limit" }, 502);

  let payload;
  try { payload = JSON.parse(text); } catch (_) { return json({ error: "Launch Library 2 returned invalid JSON" }, 502); }
  if (!Array.isArray(payload.results)) return json({ error: "Launch Library 2 response did not contain a results array" }, 502);

  const body = JSON.stringify({
    source: "Launch Library 2",
    fetchedAt: new Date().toISOString(),
    window: { from: start.toISOString(), to: end.toISOString() },
    count: payload.results.length,
    results: payload.results
  });
  const response = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=600, s-maxage=${TTL_SECONDS}`,
      "X-Data-Cache": "MISS",
      "X-Data-Source": "Launch Library 2"
    }
  });
  try { context.waitUntil(cache.put(cacheKey, response.clone())); } catch (_) {}
  return response;
}
