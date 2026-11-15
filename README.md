# NailSalon

Design fingernails on a realistic 3D hand, in the browser. React + React Three Fiber, TypeScript, Vite; Firebase for sign-in and storage. Work in progress; runs locally for now, Cloudflare hosting is the last phase.

## Structure

- `src/core`: design model, commands and undo/redo (no UI, no 3D, no I/O).
- `src/scene`: the 3D scene (React Three Fiber).
- `src/ui`: screens and tools.
- `tests`: Vitest tests, mirroring `src`.
- `docs/plans`: requirements and design; `docs/tracking`: known defects.

## Run on Windows

1. Install Node.js 22 LTS or newer, for example in PowerShell: `winget install OpenJS.NodeJS.LTS`. Open a new terminal afterwards.
2. In the repository folder:

   ```powershell
   npm ci
   npm run dev
   ```

3. Open http://localhost:5173 in Chrome.

To try it on a phone in the same Wi-Fi network: `npm run dev -- --host`, then open the shown network address on the phone (allow Node through the Windows firewall when asked).

## Checks

```bash
npm test
npm run lint
npm run build
```

## Status

See [docs/plans/Design.md](docs/plans/Design.md) for the phases. Contributor and AI-assistant guidance is in [CLAUDE.md](CLAUDE.md).
