# NailSalon

Design fingernails on a realistic 3D hand, in the browser. React + React Three Fiber, TypeScript, Vite; Firebase for sign-in and storage; hosted on Cloudflare Workers. Work in progress.

## Structure

- `src/core`: design model, commands and undo/redo (no UI, no 3D, no I/O).
- `src/scene`: the 3D scene (React Three Fiber).
- `src/ui`: screens and tools.
- `tests`: Vitest tests, mirroring `src`.
- `docs/plans`: requirements and design; `docs/tracking`: known defects.

## Build and run

Requires Node 22.

```bash
npm ci
npm run dev
npm test
```

## Deploy

Pushes to `main` are built, tested and deployed to Cloudflare Workers by GitHub Actions. The repository needs the secrets `CLOUDFLARE_API_TOKEN` (permission *Workers Scripts: Edit*) and `CLOUDFLARE_ACCOUNT_ID`.

## Status

See [docs/plans/Design.md](docs/plans/Design.md) for the phases. Contributor and AI-assistant guidance is in [CLAUDE.md](CLAUDE.md).
