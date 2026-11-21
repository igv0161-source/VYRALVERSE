const ALLOWED_GROUPS = new Set([
  "stations", "starlink", "gps-ops", "galileo", "weather", "noaa", "geo", "active"
]);

function reply(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return reply("Method not allowed.", 405, { Allow: "GET" });

  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return reply("Cross-origin requests are not allowed.", 403);

  const group = url.searchParams.get("group") || "stations";
  if (!ALLOWED_GROUPS.has(group)) return reply("Unsupported CelesTrak catalogue.", 400);

  const cacheKey = new Request(new URL("/__vyralverse_cache/celestrak/" + group, url.origin).toString());
  const cache = caches.default;
  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Data-Cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }
  } catch (_) {
    // Continue with a direct provider request if the edge cache is unavailable.
  }

  let upstream;
  try {
    upstream = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=" +
      encodeURIComponent(group) + "&FORMAT=tle", {
        headers: { Accept: "text/plain", "User-Agent": "VYRALVERSE-GODSEYE/1.0 (public orbital data viewer)" },
        signal: AbortSignal.timeout(15000)
      });
  } catch (error) {
    return reply("CelesTrak request failed: " + String(error && error.message || error), 502);
  }

  if (!upstream.ok) {
    // Do not retry or cache provider blocks and errors. CelesTrak asks clients
    // to stop on 403/404 rather than repeatedly requesting the same resource.
    return reply("CelesTrak returned HTTP " + upstream.status + ". Check again later.", 502, {
      "X-Upstream-Status": String(upstream.status)
    });
  }

  const body = await upstream.text();
  if (!body.trim() || !/^1 /m.test(body) || !/^2 /m.test(body)) {
    return reply("CelesTrak returned an empty or invalid GP element catalogue.", 502);
  }

  const headers = {
    "Cache-Control": "public, max-age=7200, s-maxage=7200",
    "X-Data-Cache": "MISS",
    "X-Data-Source": "CelesTrak GP"
  };
  const response = new Response(body, { status: 200, headers: {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  } });
  try {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  } catch (_) {
    // A cache write failure does not invalidate the provider response.
  }
  return response;
}
