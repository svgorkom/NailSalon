import { describe, expect, it } from 'vitest';
import { createDesign } from '../../src/core';
import { AiError, httpAiDesigner } from '../../src/data/aiDesigner';

const jsonResponse = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const wish = { wish: 'Roze', part: 'hand' as const, current: createDesign('Oud'), history: [] };

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'none';
  } catch (error) {
    return error instanceof AiError ? error.kind : 'other';
  }
}

describe('httpAiDesigner', () => {
  it('sends the wish and checks the design it gets back', async () => {
    const design = createDesign('Roze');
    let sent: unknown;
    let url = '';
    const designer = httpAiDesigner(async (to, init) => {
      url = to;
      sent = JSON.parse(init.body as string);
      return jsonResponse(200, { design, message: 'Klaar!' });
    });

    expect(await designer.ask(wish)).toEqual({ design, message: 'Klaar!' });
    expect(url).toBe('/api/ai/design');
    expect(sent).toEqual(JSON.parse(JSON.stringify(wish)));
  });

  it.each([
    ['limit', async () => jsonResponse(429, { error: 'Daily AI limit reached.' })],
    ['signedOut', async () => new Response(null, { status: 302, headers: { location: '/login' } })],
    ['unavailable', async () => new Response('<html></html>', { status: 404, headers: { 'content-type': 'text/html' } })],
    ['failed', async () => jsonResponse(422, { error: 'The AI gave no usable design.' })],
    ['failed', async () => jsonResponse(200, { design: { name: 'x' }, message: 'Kapot' })],
    ['failed', async () => Promise.reject(new TypeError('offline'))],
  ])('fails with %s', async (kind, fetchFn) => {
    expect(await kindOf(httpAiDesigner(fetchFn).ask(wish))).toBe(kind);
  });
});
