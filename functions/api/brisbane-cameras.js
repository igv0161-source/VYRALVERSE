const TTL_SECONDS = 3600;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const DATASET_URL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/traffic-cctv-cameras/records?limit=100";

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? `public, max-age=900, s-maxage=${TTL_SECONDS}` : "no-store",
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

  const cacheKey = new Request(new URL("/__vyralverse_cache/cameras/brisbane-locations", url.origin));
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("X-Data-Cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }
  } catch (_) {}

  let upstream;
  try {
    upstream = await fetch(DATASET_URL, {
      headers: { Accept: "application/json", "User-Agent": "VYRALVERSE-GODSEYE/1.0 (Brisbane public camera locations)" },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    return json({ error: "Brisbane camera-location catalogue request failed", detail: String(error && error.message || error) }, 502);
  }
  if (!upstream.ok) return json({ error: "Brisbane open-data API returned HTTP " + upstream.status }, 502, { "X-Upstream-Status": String(upstream.status) });

  const declaredLength = Number(upstream.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Brisbane camera catalogue exceeded the size limit" }, 502);
  const bodyText = await upstream.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) return json({ error: "Brisbane camera catalogue exceeded the size limit" }, 502);

  let payload;
  try { payload = JSON.parse(bodyText); } catch (_) { return json({ error: "Brisbane open-data API returned invalid JSON" }, 502); }
  if (!payload || !Array.isArray(payload.results)) return json({ error: "Brisbane open-data response did not contain a records array" }, 502);

  const cameras = [];
  for (const item of payload.results) {
    const fields = item.fields || item.record?.fields || item;
    const geo = fields.geolocation || fields.geo_point_2d || fields.geometry;
    let lat, lon;
    if (Array.isArray(geo) && geo.length >= 2) {
      lat = Number(geo[0]);
      lon = Number(geo[1]);
    } else if (geo && typeof geo === "object") {
      lat = Number(geo.lat ?? geo.latitude);
      lon = Number(geo.lon ?? geo.lng ?? geo.longitude);
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const id = String(fields.key || item.id || fields.camera_id || cameras.length + 1).slice(0, 80);
    const street = String(fields.street_name || fields.description || "Street not supplied").slice(0, 200);
    const suburb = String(fields.suburb || "").slice(0, 100);
    cameras.push({ id, name: street, suburb, lat, lon, source: "Brisbane City Council" });
  }

  const result = {
    source: "Brisbane City Council — Traffic Management CCTV camera locations",
    license: "Creative Commons Attribution 4.0",
    fetchedAt: new Date().toISOString(),
    count: cameras.length,
    cameras
  };
  const response = new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=900, s-maxage=${TTL_SECONDS}`,
      "X-Data-Cache": "MISS",
      "X-Data-Source": "Brisbane City Council open data"
    }
  });
  try { context.waitUntil(cache.put(cacheKey, response.clone())); } catch (_) {}
  return response;
}
