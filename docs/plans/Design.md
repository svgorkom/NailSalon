# Design and plan

How NailSalon meets [Requirements.md](Requirements.md), and the phases to build it.

## Technology

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | One language end to end; no interop boundary. |
| UI | React 19 | Largest ecosystem, long-term support. |
| 3D | Three.js via React Three Fiber + drei | The standard for 3D on the web; R3F keeps the scene declarative. |
| Build | Vite | Fast dev server and build. |
| Tests | Vitest (logic, components with jsdom), Playwright (browser smoke) | |
| Auth and data | Firebase Authentication (Google), Firestore, Storage | Google sign-in without our own server; free at this scale. |
| Hosting | Local (`npm run dev`) until phase 7, then Cloudflare Workers static assets | Cloudflare's recommended path for new sites; deployed with Wrangler. |

Blazor (as in Triominos) was rejected: free drawing updates the nail texture on every pointer move, which would mean C#↔JS interop per event.

## Architecture

```
ui  →  scene  →  core
 └──→  data   →  core
```

`core` never imports React, Three.js, Firebase or the DOM.

- **`src/core`**: the design model and all rules. A `Design` has five `Nail`s (thumb to little finger); a nail has shape, length, base colour, finish, pattern, stickers and a drawing reference. Changes are pure functions (`(design, command) → design`); `History` gives undo and redo. Validation (ranges, ids) lives here.
- **`src/scene`**: React Three Fiber components. The hand is a GLB model lit by an HDRI environment. Nails are generated from shape and length (`core` gives the outline; the scene extrudes and curves it) and anchored to the fingertips, so every shape and length works without extra models. Materials use `MeshPhysicalMaterial` (clearcoat for gloss, metalness/roughness for chrome and matte, a sparkle map for glitter).
- **Nail texture**: per nail, a 2D canvas combines base colour, pattern, stickers and the drawing layer; the canvas is the live texture of the nail. Composition logic is pure and tested; only the final draw touches the canvas.
- **`src/ui`**: screens (sign-in, Mijn ontwerpen, editor), the tool bar and the drawing pad. Sends commands to `core`; holds no rules.
- **`src/data`**: `DesignRepository` interface with a Firebase implementation and an in-memory one for tests. Firestore `users/{uid}/designs/{designId}`; drawings as PNG in Storage under `users/{uid}/designs/{designId}/`. Security rules allow only the owner's daughter's uid.

## Performance

- Render on demand (`frameloop="demand"`); invalidate only on change.
- Device pixel ratio capped at 2; lower-resolution textures on phones.
- Draco/meshopt-compressed GLB; textures in KTX2 where it helps.
- Measure in the Chrome profiler after visual changes: 60 fps, frame under 10 ms.

## Running and hosting

- Phases 1-6: the app runs locally on a Windows PC with `npm run dev`. CI only lints, tests and builds.
- Sign-in uses `signInWithPopup`; `localhost` is a Firebase authorized domain by default. The redirect flow is unreliable on domains other than Firebase Hosting, so popup stays the choice after deployment.
- Phase 7: Cloudflare Workers with static assets (Wrangler config, SPA fallback to `index.html`), deployed by GitHub Actions on push to `main` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). The Cloudflare domain is added to Firebase *authorized domains*.

## Phases

Each phase on its own branch; the owner merges.

1. **Setup**: repository, CLAUDE.md, CI, requirements and this design, core model skeleton, a placeholder 3D scene.
2. **Hand and nails**: realistic hand model, generated nails, shapes and lengths, selecting a nail, camera controls.
3. **Looks**: colours, finishes, patterns, stickers, undo/redo.
4. **Free drawing**: drawing pad, brush, eraser, live texture.
5. **Sign-in and cloud**: Firebase, Google sign-in, saving, Mijn ontwerpen.
6. **Export and share**: PNG export, Web Share API.
7. **Deploy**: Cloudflare Workers, deploy job in CI, Cloudflare domain in Firebase.

## Open items

- A realistic hand model (GLB, licence CC0 or CC-BY, outstretched hand) is to be supplied by the owner. Until then a placeholder is used.
- A Firebase project is to be created by the owner before phase 5.
