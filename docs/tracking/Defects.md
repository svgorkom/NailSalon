# Known defects

## Fixed

| ID | Item | Fix |
|---|---|---|
| D-001 | Placeholder hand (phase 1): nails intersected the fingertips and the thumb was cut off on narrow phones. | Replaced by the hand model in `public/assets/hand/hand.glb` with generated nails anchored to the fingertips; checked at 390 px wide, the whole hand and the thumb fit. |
| D-003 | F5 in Visual Studio failed (EBUSY from `npm install`, nothing listening on the port, "startup project cannot be launched", `integratedTerminal` unsupported) with the JavaScript project (`.esproj`) and `launch.json`. | Replaced by `host/NailSalon.Host.csproj`, the TriominosTheGame setup: .NET web project, npm runs from build targets only when needed, Kestrel serves the Vite build; one copy of `three` (override for `stats-gl`). |
| D-004 | Dragging the tools panel wider pushed it off the right edge of the screen: the hand column (`1fr`) never got narrower than its canvas. A stored width could also exceed a smaller window. | Grid column `minmax(0, 1fr)` with `min-width: 0` on the viewer; the panel column is `min(width, 60%)`. Checked at 1280 and 900 px wide. |
| D-005 | On a phone the tools panel could not be scrolled by touch: the fixed head took half the panel and did not scroll, and in draw, sticker and gem mode the sticky drawing pad was taller than the scrolling part, so it covered everything below it and a swipe on it drew instead of scrolling. | On small or low screens (`max-width: 720px`, portrait, or `max-height: 600px`) the whole panel scrolls as one and the pad no longer sticks. Checked with touch swipes at 390 × 844 and 844 × 390: swiping on the head and beside the pad scrolls, drawing on the pad still draws. |


## Open

| ID | Item |
|---|---|
| D-002 | `npm audit` reports a moderate issue in `minimatch` via `typescript-eslint` (dev only, lint time, no user input). Update when typescript-eslint ships a fix. |
