# VYRALVERSE
**The Internet's Playground** — Enter the Unknown. Create the Unexpected.

Live site: https://vyralverse.pages.dev  
Source: https://github.com/igv0161-source/VYRALVERSE

## Experience
- Six original interactive worlds plus the NEXUS creation workspace.
- NEXUS STUDIO: HTML, CSS and JavaScript editor, sandboxed live preview, starter templates, local save, JSON project import/export, mini-app and arcade starter projects.
- NEXUS VISUAL BUILDER: drag-and-drop page sections, editable content and styling, desktop/tablet/mobile preview, undo/redo, standalone HTML export and portable JSON projects.
- Supabase Auth-backed private cloud project storage for Visual Builder projects.
- Existing explorer identity, XP, leaderboard, rooms and realtime community features remain in the main experience.

## Frontend
The site is currently a lightweight static HTML/CSS/JavaScript project served by Cloudflare Pages. The Supabase publishable key is intentionally used in browser code; it is designed for public clients and is protected by database Row Level Security. Never put a Supabase secret or service-role key in this repository.

## Backend
Supabase project: `lrkntokhyyufgtwoeisw` (Asia Pacific — Mumbai).

The NEXUS Visual Builder uses `public.studio_projects`:
- One row belongs to one authenticated user.
- RLS is enabled with owner-only SELECT / INSERT / UPDATE / DELETE policies.
- Project JSON is limited to 512 KiB per row.
- The schema source is in [backend/studio_projects.sql](backend/studio_projects.sql).

## Local development
Open `index.html` through a local static web server. The browser pages use ES modules and Supabase's browser ESM build, so opening files directly with `file://` may block module loading. No Node build step is currently required for the static site.

## Important capability boundaries
- Visual Builder export produces a real standalone HTML website.
- NEXUS code editor preview runs inside a sandboxed browser iframe.
- These browser tools do **not** compile native Android APKs.
- AI code generation is not enabled until a model provider and its secure server-side key are deliberately configured.
- GitHub sync and one-click hosting deployment require an authorized provider integration; no fake connected state is shown.
