# GODSEYE — secure live vessel feed setup

The AIS vessel layer uses the AISStream WebSocket API through the same-origin Cloudflare Pages Function at `/api/vessels`.

**Do not put the AISStream key in browser code, HTML, GitHub, or a client-side setting.** AISStream explicitly requires server-side key storage and does not permit direct browser connections.

## Configure the provider key

1. Create a free AISStream account at https://aisstream.io/ and generate an API key.
2. Open the Cloudflare dashboard and select the **VYRALVERSE Pages project** (`vyralverse`).
3. Open **Settings → Variables and Secrets**.
4. Under **Production**, add a secret named exactly `AISSTREAM_API_KEY`.
5. Paste the key as the secret value and save.
6. Trigger a new Pages deployment (a new commit also triggers deployment).

Do not paste the key into a VYRALVERSE chat, issue, source file, or browser input. The function sends it from Cloudflare's server runtime to AISStream and relays only AIS messages to the browser.

## Runtime behavior and limitations

- The proxy validates the browser Origin, validates map-centre coordinates, limits each subscription to a 10° × 10° box, and applies a best-effort per-IP reconnect throttle.
- The subscription box is fixed when connected. Reconnect after moving the globe to another region.
- AIS is a broadcast/receiver network. Coverage is uneven, especially far offshore and in regions with few receivers. No message does not mean no ship exists.
- AIS reports can be delayed, missing, inaccurate, or intentionally disabled. Do not use this display for navigation, emergency response, or security decisions.
- The site reports **CONNECTED** after the WebSocket opens and **LIVE** only after actual vessel position reports arrive.
- AISStream is a free public API but provides no uptime or delivery SLA. See https://www.aisstream.io/documentation/.

## Recent space-launch layer

The **Recent space launches** layer uses the public Launch Library 2 API through the Cloudflare Pages Function at `/api/launches`.

- No provider key is required for the public endpoint.
- The function requests the previous 30 days, validates the response, limits its size, and caches successful data at the edge for one hour to stay well below the provider's anonymous rate limit.
- Launch markers are placed only when the provider supplies valid launch-pad coordinates.
- Provider rate limits or outages are reported as unavailable; no launch markers are fabricated.
- Source: https://ll.thespacedevs.com/ and Launch Library 2.

## Original GOD'S EYE VIEW project

VYRALVERSE's GODSEYE page is an independent integration inspired by, and selectively extending, the original MIT-licensed project. It is not a full port of the upstream Vue application. The original project currently documents a hosted-version waitlist; its official online page says no official hosted instance is available yet.

- Original source and installation instructions: https://github.com/bilawalsidhu/gods-eye-view
- Official hosted-version information: https://godseyeview.ai/online/

The original MIT license covers its source code, not its third-party datasets, imagery, API services or trademark. This integration does not copy upstream bundled datasets or claim rights to those assets. Always follow the current per-provider terms and attribution.

## Global tropical cyclone layer (GDACS)

The **Global tropical cyclones** layer uses the public GDACS GeoJSON feed through the same-origin Cloudflare Pages Function at `/api/cyclones`.

- Source feed: `https://www.gdacs.org/contentdata/xml/gdacsTC.geojson`
- GDACS combines tropical-cyclone bulletins from NOAA and JTWC for worldwide coverage; the GDACS analysis also uses additional rainfall and storm-surge inputs. This layer plots only geometries supplied by the feed. It does not invent a forecast track or cone.
- The Pages Function validates the GeoJSON FeatureCollection, enforces a 12 MiB response limit, uses a 20-second upstream timeout, and caches successful responses at the edge for 15 minutes.
- Data is provided by the Global Disaster Awareness and Coordination System (GDACS), European Commission Joint Research Centre. Reuse is allowed under the European Union CC BY 4.0 notice for the event data; provide attribution to GDACS.
- Storm tracks/impact geometries may be delayed or absent. This is an informational public-data layer, not an official warning, forecast, navigation or emergency-response system.
- API quick start: https://www.gdacs.org/Documents/2025/GDACS_API_quickstart_v2.pdf
- GDACS cyclone methodology: https://data.gdacs.org/Knowledge/models_tc.aspx

## Brisbane City Council CCTV locations

The public-camera catalogue now also includes Brisbane City Council's **Traffic Management — Camera locations** dataset via the same-origin Pages Function `/api/brisbane-cameras`.

- The dataset is published by Brisbane City Council under **Creative Commons Attribution 4.0 (CC BY 4.0)** and is updated daily according to its catalogue metadata.
- The dataset provides camera identifiers, street/suburb information and geographic coordinates. It does **not** provide a public live image/video URL. The app therefore shows a location marker only and does not pretend that footage is available.
- Official dataset: https://data.brisbane.qld.gov.au/explore/dataset/traffic-cctv-cameras/
- Council CCTV information and footage-request process: https://www.brisbane.qld.gov.au/transport-and-parking/traffic-management-and-safety/traffic-safety-and-cctv

