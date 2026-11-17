import { describe, expect, it } from 'vitest';
import { createDesign } from '../../src/core';
import { httpDesignRepository, RepositoryError } from '../../src/data/designRepository';

const ID = '0b6f1c1e-1a2b-4c3d-8e9f-001122334455';

const jsonResponse = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'none';
  } catch (error) {
    return error instanceof RepositoryError ? error.kind : 'other';
  }
}

describe('httpDesignRepository', () => {
  it('opens a design and checks it', async () => {
    const design = createDesign('Zomer');
    const calls: string[] = [];
    const repository = httpDesignRepository(async (url, init) => {
      calls.push(`${init.method ?? 'GET'} ${url}`);
      return jsonResponse(200, { id: ID, name: 'Zomer', favorite: false, updatedAt: 5, design });
    });

    expect(await repository.open(ID)).toEqual({ summary: { id: ID, name: 'Zomer', favorite: false, updatedAt: 5 }, design });
    expect(calls).toEqual([`GET /api/designs/${ID}`]);
  });

  it('sends the design and the favourite when saving', async () => {
    let sent: unknown;
    const repository = httpDesignRepository(async (_, init) => {
      sent = JSON.parse(init.body as string);
      return jsonResponse(200, { id: ID, name: 'Zomer', favorite: true, updatedAt: 5 });
    });
    const design = createDesign('Zomer');

    expect((await repository.save(ID, design, true)).favorite).toBe(true);
    expect(sent).toEqual({ design, favorite: true });
  });

  it('tells why it failed', async () => {
    const answering = (response: Response) => httpDesignRepository(async () => response);
    expect(await kindOf(answering(new Response('<html>', { headers: { 'content-type': 'text/html' } })).list())).toBe('unavailable');
    expect(await kindOf(answering(jsonResponse(401, { error: 'x' })).list())).toBe('signedOut');
    expect(await kindOf(answering(new Response(null, { status: 302, headers: { location: '/login' } })).list())).toBe('signedOut');
    expect(await kindOf(answering(jsonResponse(413, { error: 'x' })).save(ID, createDesign('a'), false))).toBe('tooLarge');
    expect(await kindOf(answering(jsonResponse(503, { error: 'x' })).list())).toBe('notConfigured');
    expect(await kindOf(answering(jsonResponse(500, { error: 'x' })).list())).toBe('failed');
    expect(await kindOf(answering(jsonResponse(200, { id: ID, design: { name: 'kapot' } })).open(ID))).toBe('failed');
    expect(await kindOf(httpDesignRepository(async () => Promise.reject(new TypeError('offline'))).list())).toBe('failed');
  });
});
