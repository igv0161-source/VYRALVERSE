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
