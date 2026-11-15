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

- **`src/core`**: the design model and all rules. A `Design` has five `Nail`s (thumb to little finger); a nail has shape, length, base colour, finish, French tip, stickers, gems and drawing strokes. Changes are pure functions (`(design, command) → design`); `History` gives undo and redo. Validation (ranges, ids) lives here.
- **`src/scene`**: React Three Fiber components. The hand is a GLB model lit by an HDRI environment. Nails are generated from shape and length (`core` gives the outline; the scene extrudes and curves it) and anchored to the fingertips, so every shape and length works without extra models. Materials use `MeshPhysicalMaterial` (clearcoat for gloss, metalness/roughness for chrome and matte, a sparkle map for glitter).
- **Nail texture**: per nail, a 2D canvas combines base colour, the French tip (from the free edge down to its depth, ending in a smile line that is deepest at the sides), the drawing layer (eraser strokes only remove drawing, never the base colour), then stickers, clipped to the nail outline (other patterns go between base colour and drawing, like the French tip). The canvas is the live texture of the nail and the same canvas is shown on the drawing pad. Positions are fractions of the nail (x across, y from free edge to cuticle), sizes fractions of its width. A stroke that is being drawn goes straight onto the canvas; only the finished stroke becomes a command, so one stroke is one undo step. Sticker shapes are SVG paths in code (original, no asset licence).
- **Gems**: 3D meshes standing on the nail, not part of the texture. A gem uses the same texture position and size as a sticker; `surfaceFrame` in `src/scene/nailGeometry.ts` turns it into a point and normal on the nail plate with the same formula as the mesh, so the gem sits where the pad shows it. Shapes are made in code (`src/scene/gems.ts`): a faceted lathe for the diamond, a flattened half sphere for the pearl, a bevelled extruded heart; one geometry per kind is shared. Solid gems are faceted with clearcoat and iridescence; clear gems use transmission (glass), tinted by their colour. The pad draws gems flat over the texture; while a gem is dragged only the pad follows, and the 3D gem moves when it is let go.
- **`src/ui`**: screens (sign-in, Mijn ontwerpen, editor), the tool bar and the drawing pad. Sends commands to `core`; holds no rules.
- **`src/data`**: `DesignRepository` interface with a Firebase implementation and an in-memory one for tests. Firestore `users/{uid}/designs/{designId}`; drawing strokes are vector data inside the design document (replayed onto the nail texture), so undo and redo are exact; PNG files in Storage are only for exported images, under `users/{uid}/designs/{designId}/`. Security rules allow only the owner's daughter's uid.

## Performance

- Render on demand (`frameloop="demand"`); invalidate only on change.
- Device pixel ratio capped at 2; lower-resolution textures on phones.
- Draco/meshopt-compressed GLB; textures in KTX2 where it helps.
- Measure in the Chrome profiler after visual changes: 60 fps, frame under 10 ms.

## Running and hosting

- Phases 1-6: the app runs locally on a Windows PC: F5 in Visual Studio runs `host/NailSalon.Host` (ASP.NET Core serving the Vite build in `host/wwwroot`), as in TriominosTheGame; `npm run dev` gives hot reload. CI lints, tests and builds, including the host.
- Sign-in uses `signInWithPopup`; `localhost` is a Firebase authorized domain by default. The redirect flow is unreliable on domains other than Firebase Hosting, so popup stays the choice after deployment.
- Phase 7: Cloudflare Workers with static assets (Wrangler config serving `host/wwwroot`, SPA fallback to `index.html`), deployed by GitHub Actions on push to `main` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). The Cloudflare domain is added to Firebase *authorized domains*.

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

- The hand model is in place (see *Hand model*). A scan-quality skin (photo-based textures, veins, palm lines) and a left hand are not there yet.
- Stickers and free drawing were built before the hand model. The flat drawing pad still uses the placeholder outline from `traceNailOutline`; the 3D nail takes the shape from core. The UV convention (top of the texture is the free edge) stays.
- Strokes make the design document grow. Check against the Firestore 1 MB document limit in phase 5; if needed, simplify points or store the drawing separately.
- A Firebase project is to be created by the owner before phase 5.

## Hand model

`public/assets/hand/hand.glb` (about 2.5 MB; metres, wrist at the origin, fingers along +y, back of the hand towards +z, right hand; mirror with `scale.x = -1` for a left hand).

- `Hand`: one skinned mesh (about 28,000 vertices) with a single material: colour, normal and roughness textures (2048², JPEG). The scene tints the material per skin tone (`skinTint` in `src/ui/skin.ts`, relative to the texture's average colour).
- `HandRig`: 22 bones (`lowerarm01/02`, `wrist`, `metacarpal1-4`, `finger1-3 × 3`, all `.R`) in a glTF skin. The hand is in a fixed pose; the thumb is twisted 60° about its own axis so that its nail faces up and out instead of sideways.
- `NailBed_Thumb|Index|Middle|Ring|Pinky`: one empty per finger, a child of the last finger bone. Local axes: x across the nail, y from cuticle to tip, z up from the nail. Custom properties (`extras`, read as `userData`): `nailWidth` and `bedLength` in metres, and `gx`, `gy`, `gxx`, `gxy`, `gyy`, the height of the nail surface `gx·x + gy·y + gxx·x² + gxy·x·y + gyy·y²` (a quadratic fitted to the nail area of the mesh).
- Nails are not in the file. `src/scene/nailBed.ts` reads the anchors; `src/scene/nailGeometry.ts` builds a nail plate that follows the nail surface and continues as a free edge. `core` decides the outline (`tipWidth`) and the length (`freeEdgeRatio`). All seven shapes and every length work without extra models, and the nails move with the bones if the hand is ever posed.
- Picking: a tap on a nail selects it; a tap on the skin selects the finger whose nail is within 3 cm (`nearestFinger`), because a nail is small on a phone.

When the model is regenerated, keep these names and axes. In Blender's glTF export the local axes of an empty are the Blender axes `(x, y, z) → (x, z, −y)`, so the anchor frame there is `(across, −up, along)`.

