# Known defects

## Fixed

| ID | Item | Fix |
|---|---|---|
| D-003 | Visual Studio build failed with EBUSY: the SDK ran `npm install` on every restore and build while node_modules was in use. | `NailSalon.esproj` installs only when `package-lock.json` changed; one copy of `three` (override for `stats-gl`). |

| D-004 | F5 in Visual Studio opened Chrome on an address where nothing listened. | Removed `.vscode/launch.json` (VS debugged with it and skipped `npm run dev`); Vite opens the browser. |

## Open

| ID | Item |
|---|---|
| D-001 | Placeholder hand (phase 1): nails intersect the fingertips and the thumb is cut off on narrow phones. Replaced in phase 2. |
| D-002 | `npm audit` reports a moderate issue in `minimatch` via `typescript-eslint` (dev only, lint time, no user input). Update when typescript-eslint ships a fix. |
