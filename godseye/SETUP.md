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

