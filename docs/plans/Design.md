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
| Hosting | Local (`npm run dev`) until phase 7, then Cloudflare Workers static assets (Git integration) | Cloudflare builds and deploys on every push to `main`; no tokens or CI job. |

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
- **Gems**: 3D meshes standing on the nail, not part of the texture. A gem uses the same texture position and size as a sticker; `surfaceFrame` in `src/scene/nailGeometry.ts` turns it into a point and normal on the nail plate with the same formula as the mesh, so the gem sits where the pad shows it. Shapes are made in code (`src/scene/gems.ts`): a faceted lathe for the diamond, a flattened half sphere for the pearl, a bevelled extruded heart, and bevelled extrusions of the flat outlines in `src/scene/gemOutlines.ts` (square, drop, star), which the pad and the kind buttons draw too; one geometry per kind is shared. Solid gems are faceted with clearcoat and iridescence; clear gems use transmission (glass), tinted by their colour. The pad draws gems flat over the texture; while a gem is dragged only the pad follows, and the 3D gem moves when it is let go.
- **`src/ui`**: screens (sign-in, Mijn ontwerpen, editor), the tool bar and the drawing pad. Sends commands to `core`; holds no rules.
- **`src/data`**: `DesignRepository` interface with a Firebase implementation and an in-memory one for tests. Firestore `users/{uid}/designs/{designId}`; drawing strokes are vector data inside the design document (replayed onto the nail texture), so undo and redo are exact; PNG files in Storage are only for exported images, under `users/{uid}/designs/{designId}/`. Security rules allow only the two family accounts (owner and daughter).

## Performance

- Render on demand (`frameloop="demand"`); invalidate only on change.
- Device pixel ratio capped at 2; lower-resolution textures on phones.
- Draco/meshopt-compressed GLB; textures in KTX2 where it helps.
- Measure in the Chrome profiler after visual changes: 60 fps, frame under 10 ms.

## Running and hosting

- Phases 1-6: the app runs locally on a Windows PC: F5 in Visual Studio runs `host/NailSalon.Host` (ASP.NET Core serving the Vite build in `host/wwwroot`), as in TriominosTheGame; `npm run dev` gives hot reload. CI lints, tests and builds, including the host.
- Sign-in uses `signInWithPopup`; `localhost` is a Firebase authorized domain by default. The redirect flow is unreliable on domains other than Firebase Hosting, so popup stays the choice after deployment.
- Phase 7: Cloudflare Workers with static assets, connected to the GitHub repository (Workers Builds). Production branch `main`; build command `npm run build`; deploy command `npx wrangler deploy`; `wrangler.jsonc` serves `host/wwwroot` with SPA fallback to `index.html`. The `workers.dev` address is added to Firebase *authorized domains*.
- Access control: the whole site (the `workers.dev` address) sits behind Cloudflare Access (free plan), with one Allow policy for the owner's and the daughter's accounts (Google login; one-time PIN by e-mail as a fallback), set on the Worker's *Access* tab. The app needs no sign-in code for this. Preview URLs stay off. A custom domain is not used for now.

## Phases

Each phase on its own branch; the owner merges.

1. **Setup**: repository, CLAUDE.md, CI, requirements and this design, core model skeleton, a placeholder 3D scene.
2. **Hand and nails**: realistic hand model, generated nails, shapes and lengths, selecting a nail, camera controls.
3. **Looks**: colours, finishes, patterns, stickers, undo/redo.
4. **Free drawing**: drawing pad, brush, eraser, live texture.
5. **Sign-in and cloud**: Firebase, Google sign-in, saving, Mijn ontwerpen.
6. **Export and share**: PNG export, Web Share API.
7. **Deploy**: Cloudflare Workers with Access, workers.dev address in Firebase.

## Open items

- The hand model is in place (see *Hand model*). A scan-quality skin (photo-based textures, veins, palm lines) and a left hand are not there yet.
- The foot model is in place (see *Foot model*) but the app does not load it yet: `core` only knows five fingers, there is no hand/foot switch, and `findNailAnchors` looks for the hand's anchor names. Toenails probably need a shorter maximum length and fewer shapes.
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

## Foot model

`public/assets/foot/foot.glb` (about 2.2 MB; same conventions as the hand: metres, glTF Y-up, right foot; mirror with `scale.x = -1` for a left foot). The ankle joint is in the origin, the toes point along +y and the top of the foot faces +z, so the foot is seen from above like the hand is seen from its back.

- `Foot`: one skinned mesh (about 18,500 vertices: the MPFB base mesh at subdivision level 2) with a single material `Skin`: colour, normal and roughness textures (2048² JPEG). Built from the same MPFB body settings as the hand (female, Caucasian, age 0.5, muscle and weight 0.4), so proportions and skin match. The average colour of the colour texture is the hand texture's (`TEXTURE_AVERAGE` in `src/ui/skin.ts`), so `skinTint` works unchanged. The skin is procedural, with fine lines at the toe joints, redder toe tips and pink nail areas; there are no sole ridges or veins.
- `FootRig`: 16 bones (`lowerleg02.R`, `foot.R`, `toe1-1.R`, `toe1-2.R` and `toeN-1..3.R` for N = 2..5, in one glTF skin). The foot is in a fixed pose, pointed 60° (plantar flexion), with about 10 cm of shin: the toes point up the screen and the shin runs towards the viewer, instead of the shin standing straight up out of the screen as it does in a standing foot.
- `NailBed_BigToe|SecondToe|ThirdToe|FourthToe|LittleToe`: one empty per toe, a child of the last toe bone (`toe1-2.R`, `toeN-3.R`). Same local axes and `extras` as the finger anchors (x across the nail, y from cuticle to tip, z up; `nailWidth`, `bedLength`, `gx`, `gy`, `gxx`, `gxy`, `gyy`), plus `toe`. Nail widths are 14.9 mm (big toe), 9.6, 7.4, 7.3 and 6.8 mm (little toe). The fitted nail surface lies within 0.2–0.5 mm (at most 1.4 mm) of the skin.
- Nails are not in the file; they are generated from the anchors, as on the hand.
- The foot is made with `tools/foot-model` (MPFB in `bpy`, see its README). When regenerating, keep these names and axes; the exporter detail of the hand section applies to the anchors too.

### Foot in the app

- The first screen asks "Wat ga je lakken?": a card for the hand and one for the foot. "Kies opnieuw" in the header goes back; the design is kept.
- One design holds both sets: `nails` (fingers) and `toenails` (toes). Choosing hand or foot only changes the view.
- `Target` is a digit (finger or toe), `'fingers'` or `'toes'`. Toenails allow `TOE_SHAPES` (round, oval, square, soft square) and at most `TOE_MAX_LENGTH`; `apply` throws `RangeError` otherwise. The maximum of 0.3 and the shapes are a first guess: adjust after trying.
- `ModelScene` shows the hand or the foot (`SETUPS` in `src/scene/ModelScene.tsx`: scale, camera target, pick distance).
- No left/right switch for now; the left foot comes later by mirroring.
