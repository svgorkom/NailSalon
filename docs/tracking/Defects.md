# Known defects

## Fixed

| ID | Item | Fix |
|---|---|---|
| D-003 | Visual Studio build failed with EBUSY: the SDK ran `npm install` on every restore and build while node_modules was in use. | `NailSalon.esproj` installs only when `package-lock.json` changed; one copy of `three` (override for `stats-gl`). |

| D-004 | F5 in Visual Studio opened Chrome on an address where nothing listened, or "startup project cannot be launched". | `.vscode/launch.json` is what the Start button runs; it now starts `npm run dev` (node launch of npm, `console: internalConsole`; Visual Studio does not support `integratedTerminal`: "RunInTerminal request with kind 'Integrated' is not currently supported"). Set NailSalon as startup project. |

## Open

| ID | Item |
|---|---|
| D-001 | Placeholder hand (phase 1): nails intersect the fingertips and the thumb is cut off on narrow phones. Replaced in phase 2. |
| D-002 | `npm audit` reports a moderate issue in `minimatch` via `typescript-eslint` (dev only, lint time, no user input). Update when typescript-eslint ships a fix. |
