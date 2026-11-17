# NailSalon

Design fingernails on a realistic 3D hand, in the browser. React + React Three Fiber, TypeScript, Vite; designs are saved in Cloudflare D1 through a small Worker API. Work in progress; runs locally for now; Cloudflare Workers hosting, see Deploy.

## Structure

- `src/core`: design model, commands and undo/redo (no UI, no 3D, no I/O).
- `src/scene`: the 3D scene (React Three Fiber).
- `src/ui`: screens and tools.
- `src/data`: talks to the designs API.
- `src/worker`: the Cloudflare Worker with the designs API (`/api/*`).
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

## Deploy

Hosted on Cloudflare Workers (static assets) at https://nailsalon.svgorkom.workers.dev, connected to this repository (Workers Builds): every push to `main` is built (`npm run build`) and deployed (`npx wrangler deploy`, configured in `wrangler.jsonc`) by Cloudflare. The site is behind Cloudflare Access: only the two allowed accounts get in. There is no deploy step in CI.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Status

See [docs/plans/Design.md](docs/plans/Design.md) for the phases. Contributor and AI-assistant guidance is in [CLAUDE.md](CLAUDE.md).

Saved designs live in the D1 database `nailsalon`, created by the first deploy after this was added. The API checks the Cloudflare Access token itself; it needs the Access application's AUD tag in `ACCESS_AUD` in `wrangler.jsonc` (Zero Trust → Access → Applications → the NailSalon app → *Application Audience (AUD) Tag*). While that is empty, saving and opening refuse every request. Locally (Visual Studio or `npm run dev`) there is no API: the editor works, saving shows that it only works online.
