import { type AiAnswer, type AiChatMessage, type AiPart, type Design, parseDesign } from '../core';

export interface AiWish {
  readonly wish: string;
  readonly part: AiPart;
  readonly current: Design;
  readonly history: readonly AiChatMessage[];
}

/**
 * Why the AI gave no design:
 * - `unavailable`: there is no server, for example when the app runs locally on the PC;
 * - `signedOut`: the Access login has expired; reloading the page signs in again;
 * - `limit`: the AI requests for today are used up;
 * - `failed`: anything else, such as no internet or no usable answer.
 */
export type AiErrorKind = 'unavailable' | 'signedOut' | 'limit' | 'failed';

export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Asks the AI for a design. Throws AiError. */
export interface AiDesigner {
  ask(wish: AiWish): Promise<AiAnswer>;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Talks to `POST /api/ai/design` of the Worker (`src/worker/ai.ts`) on the same address. */
export function httpAiDesigner(fetchFn: Fetch): AiDesigner {
  return {
    async ask(wish) {
      let response: Response;
      try {
        response = await fetchFn('/api/ai/design', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wish), credentials: 'same-origin', redirect: 'manual' });
      } catch {
        throw new AiError('failed', 'Network error.');
      }
      if (response.type === 'opaqueredirect' || response.status === 401 || (response.status >= 300 && response.status < 400)) throw new AiError('signedOut', 'Not signed in.');
      if (!(response.headers.get('content-type') ?? '').includes('application/json')) throw new AiError('unavailable', 'No AI server.');
      if (response.status === 429) throw new AiError('limit', 'Daily AI limit reached.');
      if (!response.ok) throw new AiError('failed', `Server answered ${response.status}.`);
      const { design, message } = (await response.json()) as { design?: unknown; message?: unknown };
      try {
        return { design: parseDesign(design), message: typeof message === 'string' ? message : '' };
      } catch {
        throw new AiError('failed', 'The AI design is damaged.');
      }
    },
  };
}
