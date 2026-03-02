Plan: Add CodePen three.js Globe to Web UI

TL;DR — Convert the CodePen globe into a React/three.js component served from the Web UI, host globe textures locally to avoid CORS/“Load failed”, add an interactive origin marker with tooltip/actions, and expose a simple toggle to switch between the globe and future map views. This plan lists exact files to create/edit, dependency updates, assets to add, and verification steps so you can implement the change reliably.

Steps
1. Add dependencies
   - Edit `web/package.json` (or root if web shares deps) to add:
     - `three`
     - `@react-three/fiber`
     - `@react-three/drei`
   - Install via `npm install` or `pnpm` in `web/`.

2. Add local assets
   - Create `web/public/assets/earth.jpg` (or `earth-2k.jpg`) and `web/public/assets/marker.png`.
   - Use compressed/resized images for fast dev.

3. New React three.js component
   - Add `web/src/components/GlobeThree.tsx` implementing the CodePen behavior using `three` + `@react-three/fiber`:
     - Load `/assets/earth.jpg` via three `TextureLoader` (served from `public/`).
     - Create a textured sphere, lighting, and OrbitControls from `@react-three/drei`.
     - Accept props: `originLat`, `originLng`, `onMarkerClick(signatureId)`, `signatures?`, `focusSignatureId?`.
     - Convert lat/lng → Cartesian on the sphere, render a pulsing `mesh` or `Sprite` marker and an optional arc from origin to other points.
     - Add pointer handlers to show a lightweight React overlay tooltip and call `onMarkerClick`.
     - Ensure safe fallbacks when texture fails (log + neutral color).

4. Add demo service-location map
   - Add `web/src/data/serviceLocations.ts` mapping `originServiceId` → `{ lat, lng, label }` for demo data.
   - Use this mapping in the detail view when signatures lack coordinates.

5. Wire into UI (Signature detail and toggle)
   - Edit or add `web/src/components/SignatureDetail.tsx` to render the globe when a signature is selected and provide a small “3D Globe / Map” toggle.
   - Compute origin coordinates from `serviceLocations` or signature fields and pass to `GlobeThree`.
   - Add marker tooltip actions: “View signature”, “Copy seed”, “Focus list”.

6. Host texture locally and fix "Load failed"
   - Replace external texture URLs (e.g., unpkg) with local `/assets/earth.jpg`.
   - Verify Vite dev server serves `/assets/*` from `web/public/` and that Network tab reports 200 for the texture.
   - If the "Load failed" originates from POSTs to a missing local receiver, run a tiny express test receiver or point `SIGNATURES_API_URL` to a reachable endpoint.

7. UX polish and accessibility
   - Add keyboard focus and aria labels for the marker and tooltip.
   - Respect `prefers-reduced-motion` to disable globe rotation when requested.

8. Tests & verification
   - Commands:
     ```bash
     cd web
     npm install
     npm run dev
     ```
   - Manual checks:
     - Open signature detail → toggle to 3D Globe → verify globe renders and marker shows at origin.
     - Network tab shows `/assets/earth.jpg` served with 200 OK (no CORS errors).
     - Console shows no "TypeError: Load failed".

Files to create/edit
- Edit: `web/package.json` — add deps
- Add: `web/public/assets/earth.jpg` and `web/public/assets/marker.png`
- Add: `web/src/components/GlobeThree.tsx`
- Add: `web/src/data/serviceLocations.ts`
- Edit or add: `web/src/components/SignatureDetail.tsx`
- Optionally edit: `web/src/components/Header.tsx` to include a global toggle

Decisions (recommended)
- Convert CodePen to a React/three.js component (full control, interactive overlay).
- Host textures locally under `web/public/assets` to eliminate CORS/load failures.
- Use `@react-three/fiber` + `@react-three/drei` for React integration and OrbitControls.

Effort estimate
- Small: add assets + basic `GlobeThree` + toggle (4–8 hours).
- Medium: polish animations, tooltips, mapping, and responsive behavior (1–2 days).
- Large: add time-based (4D) playback and Maplibre/deck.gl alternative (2–4 days).

Notes
- If you want me to implement these files now, I can produce a unified patch adding the assets and source files.
- If "Load failed" persists after hosting textures locally, provide the Network failing URL and console stack trace and I will debug further.

