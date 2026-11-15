# Known defects

## Fixed

| ID | Item | Fix |
|---|---|---|
| D-001 | Placeholder hand (phase 1): nails intersected the fingertips and the thumb was cut off on narrow phones. | Replaced by the hand model in `public/assets/hand/hand.glb` with generated nails anchored to the fingertips; checked at 390 px wide, the whole hand and the thumb fit. |
| D-003 | F5 in Visual Studio failed (EBUSY from `npm install`, nothing listening on the port, "startup project cannot be launched", `integratedTerminal` unsupported) with the JavaScript project (`.esproj`) and `launch.json`. | Replaced by `host/NailSalon.Host.csproj`, the TriominosTheGame setup: .NET web project, npm runs from build targets only when needed, Kestrel serves the Vite build; one copy of `three` (override for `stats-gl`). |
| D-004 | Dragging the tools panel wider pushed it off the right edge of the screen: the hand column (`1fr`) never got narrower than its canvas. A stored width could also exceed a smaller window. | Grid column `minmax(0, 1fr)` with `min-width: 0` on the viewer; the panel column is `min(width, 60%)`. Checked at 1280 and 900 px wide. |

## Open

| ID | Item |
|---|---|
| D-002 | `npm audit` reports a moderate issue in `minimatch` via `typescript-eslint` (dev only, lint time, no user input). Update when typescript-eslint ships a fix. |
