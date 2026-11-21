const TTL_SECONDS = 900;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? `public, max-age=300, s-maxage=${TTL_SECONDS}` : "no-store",
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

  const cacheKey = new Request(new URL("/__vyralverse_cache/gdacs/cyclones", url.origin));
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("X-Data-Cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }
  } catch (_) {}

  const upstreamUrl = "https://www.gdacs.org/contentdata/xml/gdacsTC.geojson";
  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "VYRALVERSE-GODSEYE/1.0 (GDACS public cyclone data)"
      },
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    return json({ error: "GDACS cyclone feed request failed", detail: String(error && error.message || error) }, 502);
  }
  if (!upstream.ok) return json({ error: "GDACS cyclone feed returned HTTP " + upstream.status }, 502, { "X-Upstream-Status": String(upstream.status) });

  const declaredLength = Number(upstream.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "GDACS cyclone feed exceeded the size limit" }, 502);
  const bodyText = await upstream.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) return json({ error: "GDACS cyclone feed exceeded the size limit" }, 502);

  let payload;
  try { payload = JSON.parse(bodyText); } catch (_) { return json({ error: "GDACS cyclone feed returned invalid JSON" }, 502); }
  if (!payload || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    return json({ error: "GDACS cyclone feed did not contain a GeoJSON FeatureCollection" }, 502);
  }

  const features = payload.features.filter(feature => feature && feature.type === "Feature" && feature.geometry && feature.geometry.type && feature.geometry.coordinates);
  const result = {
    type: "FeatureCollection",
    source: "Global Disaster Awareness and Coordination System, GDACS",
    license: "European Union CC BY 4.0 — attribution required",
    fetchedAt: new Date().toISOString(),
    featureCount: features.length,
    features
  };
  const response = new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=${TTL_SECONDS}`,
      "X-Data-Cache": "MISS",
      "X-Data-Source": "GDACS"
    }
  });
  try { context.waitUntil(cache.put(cacheKey, response.clone())); } catch (_) {}
  return response;
}
