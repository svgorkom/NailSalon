# Known defects

## Fixed

| ID | Item | Fix |
|---|---|---|
| D-001 | Placeholder hand (phase 1): nails intersected the fingertips and the thumb was cut off on narrow phones. | Replaced by the hand model in `public/assets/hand/hand.glb` with generated nails anchored to the fingertips; checked at 390 px wide, the whole hand and the thumb fit. |
| D-003 | F5 in Visual Studio failed (EBUSY from `npm install`, nothing listening on the port, "startup project cannot be launched", `integratedTerminal` unsupported) with the JavaScript project (`.esproj`) and `launch.json`. | Replaced by `host/NailSalon.Host.csproj`, the TriominosTheGame setup: .NET web project, npm runs from build targets only when needed, Kestrel serves the Vite build; one copy of `three` (override for `stats-gl`). |

## Open

| ID | Item |
|---|---|
| D-002 | `npm audit` reports a moderate issue in `minimatch` via `typescript-eslint` (dev only, lint time, no user input). Update when typescript-eslint ships a fix. |
