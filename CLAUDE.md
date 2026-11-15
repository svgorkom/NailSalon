# CLAUDE.md

NailSalon is a web app in which the owner's daughter (12) designs fingernails on a realistic 3D hand: React 19 + React Three Fiber (Three.js), TypeScript, Vite; Firebase for Google sign-in and storage. Runs locally on a Windows PC for now; Cloudflare Workers hosting is phase 7. Requirements: [docs/plans/Requirements.md](docs/plans/Requirements.md). Design and phases: [docs/plans/Design.md](docs/plans/Design.md). Known problems: [docs/tracking/Defects.md](docs/tracking/Defects.md).

## Commands

```bash
npm ci               # install (Node 22+)
npm run dev          # dev server: http://localhost:5173
npm test             # Vitest: core and other pure logic
npm run test:watch
npm run lint         # ESLint, includes the core import boundary
npm run typecheck
npm run build        # type-check and production build into dist/
npm run preview      # serve dist/ locally
```

## Architecture

`ui → scene → core`, `ui → data → core`. Core never imports React, Three.js, Firebase or the DOM (enforced by ESLint).

- **Core** (`src/core`): the design model and all rules. Designs are immutable; `apply(design, command)` returns a new design and throws `RangeError` on invalid input. `History` gives undo/redo; a command that changes nothing is not recorded.
- **Scene** (`src/scene`): React Three Fiber. Renders the design and reports which nail was picked; no rules. Nails are generated from shape and length, not modelled.
- **UI** (`src/ui`): screens, tool bar, drawing pad. Sends commands to core.
- **Data** (`src/data`, from phase 5): `DesignRepository` interface; Firebase implementation and an in-memory one for tests.

## Rules

- The UI language is Dutch, written for a 12-year-old: short labels, icons with text. Code, comments and docs stay English.
- Rules live in core, never in components or the scene.
- Logic gets Vitest tests in `tests/` (mirroring `src/`). Fix bugs test-first. No randomness or time without injecting it.
- Performance: `frameloop="demand"`, invalidate only on change, DPR capped at 2. Never set React state per frame; use refs and `useFrame`. Check the Chrome profiler after visual changes (60 fps, frame under 10 ms, also on a phone).
- Dispose Three.js resources you create outside JSX (textures, canvases, geometries).
- Only the daughter's account may read or write data; never weaken the Firebase security rules. No analytics, no tracking, no third-party scripts.
- Assets (models, HDRIs, stickers) need a licence that allows this use; record source and licence in `public/assets/CREDITS.md`.
- No unused constants or exports, no hidden side effects (functions that mutate their arguments).
- Do not invent requirements; they are in the plan. If unclear, ask.
- The owner develops on Windows: keep scripts cross-platform (no bash-only npm scripts), line endings LF via `.gitattributes`.
- Work on a branch (`feat/`, `fix/`), not on `main`. Do not merge; the user does that.
