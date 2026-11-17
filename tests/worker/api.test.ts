import { describe, expect, it } from 'vitest';
import { createDesign } from '../../src/core';
import { handleApi, MAX_BODY_BYTES } from '../../src/worker/api';
import type { DesignStore, StoredDesign } from '../../src/worker/store';

const ID = '0b6f1c1e-1a2b-4c3d-8e9f-001122334455';

/** Keeps designs in a map, like D1 does per owner. */
function memoryStore(): DesignStore {
  const rows = new Map<string, StoredDesign>();
  const key = (owner: string, id: string) => `${owner}/${id}`;
  return {
    async list(owner) {
      return [...rows.entries()]
        .filter(([k]) => k.startsWith(`${owner}/`))
        .map(([, row]) => ({ id: row.id, name: row.name, favorite: row.favorite, updatedAt: row.updatedAt }))
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
    },
    async get(owner, id) {
      return rows.get(key(owner, id)) ?? null;
    },
    async put(owner, design) {
      rows.set(key(owner, design.id), design);
    },
    async setFavorite(owner, id, favorite) {
      const row = rows.get(key(owner, id));
      if (row === undefined) return false;
      rows.set(key(owner, id), { ...row, favorite });
      return true;
    },
    async remove(owner, id) {
      return rows.delete(key(owner, id));
    },
  };
}

function request(method: string, path: string, body?: unknown): Request {
  return new Request(`https://nailsalon.example${path}`, body === undefined ? { method } : { method, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

describe('designs API', () => {
  it('saves, lists, opens, stars and deletes a design', async () => {
    const store = memoryStore();
    const context = { store, owner: 'fleur@example.com', now: 1000 };
    const design = createDesign('Zomer');

    const saved = await handleApi(request('PUT', `/api/designs/${ID}`, { design, favorite: false }), context);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ id: ID, name: 'Zomer', favorite: false, updatedAt: 1000 });

    expect((await handleApi(request('PATCH', `/api/designs/${ID}`, { favorite: true }), context)).status).toBe(204);
    expect(await (await handleApi(request('GET', '/api/designs'), context)).json()).toEqual({ designs: [{ id: ID, name: 'Zomer', favorite: true, updatedAt: 1000 }] });
    expect(await (await handleApi(request('GET', `/api/designs/${ID}`), context)).json()).toEqual({ id: ID, name: 'Zomer', favorite: true, updatedAt: 1000, design });

    expect((await handleApi(request('DELETE', `/api/designs/${ID}`), context)).status).toBe(204);
    expect((await handleApi(request('GET', `/api/designs/${ID}`), context)).status).toBe(404);
  });

  it('keeps the designs of each account apart', async () => {
    const store = memoryStore();
    await handleApi(request('PUT', `/api/designs/${ID}`, { design: createDesign('Van mama'), favorite: false }), { store, owner: 'owner@example.com', now: 1 });
    const other = { store, owner: 'fleur@example.com', now: 2 };

    expect(await (await handleApi(request('GET', '/api/designs'), other)).json()).toEqual({ designs: [] });
    expect((await handleApi(request('GET', `/api/designs/${ID}`), other)).status).toBe(404);
    expect((await handleApi(request('DELETE', `/api/designs/${ID}`), other)).status).toBe(404);
  });

  it('rejects invalid input', async () => {
    const context = { store: memoryStore(), owner: 'a@example.com', now: 1 };
    const design = createDesign('Test');
    expect((await handleApi(request('PUT', '/api/designs/not-a-uuid', { design, favorite: false }), context)).status).toBe(400);
    expect((await handleApi(request('PUT', `/api/designs/${ID}`, { design: { ...design, name: '' }, favorite: false }), context)).status).toBe(400);
    expect((await handleApi(request('PUT', `/api/designs/${ID}`, { design }), context)).status).toBe(400);
    expect((await handleApi(request('PUT', `/api/designs/${ID}`, 'not json'), context)).status).toBe(400);
    expect((await handleApi(request('PUT', `/api/designs/${ID}`, 'x'.repeat(MAX_BODY_BYTES + 1)), context)).status).toBe(413);
    expect((await handleApi(request('POST', '/api/designs'), context)).status).toBe(405);
    expect((await handleApi(request('GET', '/api/other'), context)).status).toBe(404);
  });
});
