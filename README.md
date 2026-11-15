# NailSalon

Design fingernails on a realistic 3D hand, in the browser. React + React Three Fiber, TypeScript, Vite; Firebase for sign-in and storage. Work in progress; runs locally for now, Cloudflare hosting is the last phase.

## Structure

- `src/core`: design model, commands and undo/redo (no UI, no 3D, no I/O).
- `src/scene`: the 3D scene (React Three Fiber).
- `src/ui`: screens and tools.
- `tests`: Vitest tests, mirroring `src`.
- `host`: .NET project that builds and serves the app (F5 in Visual Studio); `host/wwwroot` is build output.
- `docs/plans`: requirements and design; `docs/tracking`: known defects.

## Run on Windows with Visual Studio

Same setup as TriominosTheGame: a .NET web project (`host/NailSalon.Host.csproj`) that builds the web app with Vite before it compiles and then serves it. Requires Visual Studio with the .NET 10 SDK and Node.js (the Node.js development workload, or Node on the PATH).

1. Open `NailSalon.slnx`.
2. Press F5. The build runs `npm install` (only when `package-lock.json` changed) and `npm run build`, then starts the site and opens http://localhost:5174.
3. After a code change: stop, press F5 again (the build takes a few seconds). For instant updates while editing, run `npm run dev` in a terminal instead and open http://localhost:5173 (hot reload).

`dotnet build host -p:SkipAppBuild=true` skips the npm steps and uses the existing `host/wwwroot`.

### Without Visual Studio

```powershell
npm install
npm run dev
```

Needs Node.js 22 or newer. Without admin rights: the Node.js **Windows Binary (.zip)** from nodejs.org, extracted in your user profile and added to your *user* `PATH`.

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
