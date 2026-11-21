const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors, ...extra }
  });
}

export async function onRequest(context) {
  const request = context.request;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const incoming = new URL(request.url);
  const lat = Number(incoming.searchParams.get("lat"));
  const lon = Number(incoming.searchParams.get("lon"));
  const dist = Number(incoming.searchParams.get("dist") || 100);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      !Number.isFinite(dist) || dist < 1 || dist > 250) {
    return json({ error: "Valid lat, lon and dist (1–250 nautical miles) are required." }, 400);
  }

  // Cache each rounded viewport briefly so map refreshes do not hammer the public receiver network.
  const roundedLat = lat.toFixed(2);
  const roundedLon = lon.toFixed(2);
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "?lat=" + roundedLat + "&lon=" + roundedLon + "&dist=" + Math.round(dist);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-VYRALVERSE-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const upstream = "https://api.adsb.lol/v2/lat/" + roundedLat +
    "/lon/" + roundedLon + "/dist/" + Math.round(dist);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(upstream, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "VYRALVERSE public-data explorer" }
    });
    if (!response.ok) {
      return json({ error: "ADS-B provider returned HTTP " + response.status, provider: "adsb.lol" }, 502);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.ac)) {
      return json({ error: "ADS-B provider response was not in the expected format.", provider: "adsb.lol" }, 502);
    }
    const result = json(data, 200, {
      "Cache-Control": "public, max-age=12",
      "X-Data-Provider": "adsb.lol",
      "X-VYRALVERSE-Cache": "MISS"
    });
    context.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch (error) {
    return json({ error: error && error.name === "AbortError" ? "ADS-B provider timed out." : "ADS-B provider is temporarily unavailable.", provider: "adsb.lol" }, 502);
  } finally {
    clearTimeout(timer);
  }
}