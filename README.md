# VYRALVERSE
**The Internet's Playground** — Enter the Unknown. Create the Unexpected.

Live site: https://vyralverse.pages.dev  
Source: https://github.com/igv0161-source/VYRALVERSE

## Experience
- Six original interactive worlds, presented on a clean entry-first home screen.
- Clear feature areas: Worlds, Play, Create, Connect and Discover; feature groups stay tucked away until the visitor enters the universe.
- NEXUS STUDIO: HTML, CSS and JavaScript editor, sandboxed live preview and sandboxed pop-out preview, starter templates, local source save, JSON project import/export, and a bounded browser-storage bridge so the Focus Board and Star Catcher can retain local app data without granting preview code access to the host site's storage.
- NEXUS VISUAL BUILDER: drag-and-drop page sections, editable content and styling, desktop/tablet/mobile preview, undo/redo, standalone HTML export and portable JSON projects.
- Command deck navigation opens collapsed feature groups before jumping to a destination.
- Supabase Auth-backed private cloud project storage for Visual Builder projects.
- Explorer progress is local for guests and server-authoritative for signed-in accounts; cloud XP, levels and discovery totals are read from Supabase.
- Friend Quests are tracked in Supabase: authenticated creators receive a share link, friends sign in to submit one completion, and the creator can read responses in a realtime inbox. Quest links expire after 30 days.
- Daily Anomaly is a UTC-reset daily Caesar-cipher puzzle. Signed-in reward claims are checked server-side and duplicate daily XP is not awarded.
- Invite-only rooms, room presence, shared pulse broadcasts, public community messages and creation posts use Supabase Auth, database policies and Realtime.
- GODSEYE uses public USGS earthquake records, GDACS disaster alerts, provider-calculated ISS position estimates, CelesTrak TLE-derived satellite estimates, ADS-B aircraft reports, optional AISStream vessel reports, Launch Library 2 launches, and Open-Meteo modelled weather. Camera coverage is limited: TfL/Tallinn snapshots, Brisbane camera locations only, and a DelDOT HLS catalogue that is currently returning HTTP 502; DelDOT playback is not verified. NASA EONET was returning HTTP 500 during verification, so GDACS replaced it.

## Frontend
The site is currently a lightweight static HTML/CSS/JavaScript project served by Cloudflare Pages. The Supabase publishable key is intentionally used in browser code; it is designed for public clients and is protected by database Row Level Security. Never put a Supabase secret or service-role key in this repository.

## Automated checks
A GitHub Actions Playwright smoke test runs on pushes and pull requests. It checks all six worlds, the tracked Friend Quest guest gate, the daily puzzle's truthful status and duplicate-reward path, random per-attempt Verse ID tags, account/recovery UI, feature and dock navigation, guest-safe community controls, live USGS/GDACS/ISS feeds, Open-Meteo weather, Visual Builder editing/undo/redo/drag/drop/import safety/export/local restore/auth gate/mobile layout, and Code Studio mini-app/game, preview-storage persistence across preview and workspace reloads, sandboxed pop-out preview, JSON import/export, local restore and reset. A separate workflow step checks the deployed Cloudflare Pages assets and selected API method/response contracts. The anonymous browser smoke suite does not sign in or prove authenticated account, private cloud save, friend-quest completion, or realtime-room end-to-end behavior; those require a dedicated test account.

## Backend
Supabase project: `lrkntokhyyufgtwoeisw` (Asia Pacific — Mumbai).

The NEXUS Visual Builder uses `public.studio_projects`:
- One row belongs to one authenticated user.
- RLS is enabled with owner-only SELECT / INSERT / UPDATE / DELETE policies.
- Project JSON is limited to 512 KiB per row.
- The `anon` role has no table privileges; authenticated users receive CRUD grants, still constrained by the four owner-only RLS policies.
- The schema source is in [backend/studio_projects.sql](backend/studio_projects.sql).
- `quest_completions` is included in the `supabase_realtime` publication so quest creators can receive new completion events. The one-time publication change is recorded in [backend/quest_realtime.sql](backend/quest_realtime.sql).

## Local development
Open `index.html` through a local static web server. The browser pages use ES modules and Supabase's browser ESM build, so opening files directly with `file://` may block module loading. No Node build step is currently required for the static site.

## Important capability boundaries
- Visual Builder export produces a real standalone HTML website.
- NEXUS code editor preview runs inside a sandboxed browser iframe.
- These browser tools do **not** compile native Android APKs.
- AI code generation is not enabled until a model provider and its secure server-side key are deliberately configured.
- GitHub sync and one-click hosting deployment require an authorized provider integration; no fake connected state is shown.
