# NailSalon

Design fingernails on a realistic 3D hand, in the browser. React + React Three Fiber, TypeScript, Vite; Firebase for sign-in and storage. Work in progress; runs locally for now, Cloudflare hosting is the last phase.

## Structure

- `src/core`: design model, commands and undo/redo (no UI, no 3D, no I/O).
- `src/scene`: the 3D scene (React Three Fiber).
- `src/ui`: screens and tools.
- `tests`: Vitest tests, mirroring `src`.
- `docs/plans`: requirements and design; `docs/tracking`: known defects.

## Run on Windows with Visual Studio

Requires Visual Studio 2022 or newer with the **Node.js development** workload (the same Node.js setup TriominosTheGame needs; no separate Node.js install).

1. Open `NailSalon.slnx`. Visual Studio runs `npm install` the first time (see the Output window, *npm*).
2. Right-click the project *NailSalon* in Solution Explorer → **Set as Startup Project** (once).
3. Press F5. `.vscode/launch.json` makes Visual Studio run `npm run dev` in a terminal; Vite then opens the browser on http://localhost:5173 (the first start takes a few seconds while Vite bundles). Stop with Shift+F5.
4. Tests appear in Test Explorer (Vitest).

### Without Visual Studio or admin rights

Download the Node.js 22 LTS **Windows Binary (.zip)** from nodejs.org, extract it to a folder in your user profile (for example `%USERPROFILE%\tools\node`) and add that folder to your *user* `PATH` (Start → "Edit environment variables for your account"). No admin rights needed. Then, in the repository folder:

```powershell
npm ci
npm run dev
```

### On a phone

`npm run dev -- --host`, then open the shown network address on a phone in the same Wi-Fi network (allow Node through the Windows firewall when asked).

## Checks

```bash
npm test
npm run lint
npm run build
```

## Status

See [docs/plans/Design.md](docs/plans/Design.md) for the phases. Contributor and AI-assistant guidance is in [CLAUDE.md](CLAUDE.md).
