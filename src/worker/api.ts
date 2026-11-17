import { parseDesign } from '../core';
import type { DesignStore } from './store';

/**
 * Largest request body the API accepts. D1 allows 2 MB per row; this leaves room for the other columns.
 * Free drawing is the only part that grows: thousands of strokes fit.
 */
export const MAX_BODY_BYTES = 1_500_000;

/** Ids are made by the browser with `crypto.randomUUID()`. */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ApiContext {
  readonly store: DesignStore;
  /** The signed-in account; designs are kept per account. */
  readonly owner: string;
  /** Milliseconds since 1970. */
  readonly now: number;
}

/**
 * The designs API:
 * - `GET /api/designs`: the saved designs, favourites first, then newest first.
 * - `GET /api/designs/{id}`: one design.
 * - `PUT /api/designs/{id}` with `{ design, favorite }`: saves a new or existing design.
 * - `PATCH /api/designs/{id}` with `{ favorite }`: marks or unmarks a favourite without sending the design.
 * - `DELETE /api/designs/{id}`.
 */
export async function handleApi(request: Request, { store, owner, now }: ApiContext): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/designs') {
    if (request.method !== 'GET') return problem(405, 'Method not allowed.');
    return json(200, { designs: await store.list(owner) });
  }

  const match = /^\/api\/designs\/([^/]+)$/.exec(path);
  const id = match?.[1];
  if (id === undefined) return problem(404, 'Not found.');
  if (!ID.test(id)) return problem(400, 'Invalid id.');

  switch (request.method) {
    case 'GET': {
      const stored = await store.get(owner, id);
      if (stored === null) return problem(404, 'Not found.');
      const { data, ...summary } = stored;
      return json(200, { ...summary, design: JSON.parse(data) as unknown });
    }
    case 'PUT': {
      const body = await readBody(request);
      if (body === null) return problem(413, 'Design is too large.');
      let parsed: { design?: unknown; favorite?: unknown };
      try {
        parsed = JSON.parse(body) as typeof parsed;
      } catch {
        return problem(400, 'Body must be JSON.');
      }
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.favorite !== 'boolean') return problem(400, 'favorite must be true or false.');
      let design;
      try {
        design = parseDesign(parsed.design);
      } catch (error) {
        if (error instanceof RangeError) return problem(400, error.message);
        throw error;
      }
      const summary = { id, name: design.name, favorite: parsed.favorite, updatedAt: now };
      await store.put(owner, { ...summary, data: JSON.stringify(design) });
      return json(200, summary);
    }
    case 'PATCH': {
      const body = await readBody(request);
      let favorite: unknown;
      try {
        favorite = (JSON.parse(body ?? '') as { favorite?: unknown }).favorite;
      } catch {
        return problem(400, 'Body must be JSON.');
      }
      if (typeof favorite !== 'boolean') return problem(400, 'favorite must be true or false.');
      return (await store.setFavorite(owner, id, favorite)) ? new Response(null, { status: 204 }) : problem(404, 'Not found.');
    }
    case 'DELETE':
      return (await store.remove(owner, id)) ? new Response(null, { status: 204 }) : problem(404, 'Not found.');
    default:
      return problem(405, 'Method not allowed.');
  }
}

/** The body as text, or null when it is larger than MAX_BODY_BYTES. */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const bytes = await request.arrayBuffer();
  return bytes.byteLength > MAX_BODY_BYTES ? null : new TextDecoder().decode(bytes);
}

export function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export function problem(status: number, message: string): Response {
  return json(status, { error: message });
}
