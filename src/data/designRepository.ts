import { type Design, parseDesign } from '../core';

/** A saved design in the list; `updatedAt` is in milliseconds since 1970. */
export interface DesignSummary {
  readonly id: string;
  readonly name: string;
  readonly favorite: boolean;
  readonly updatedAt: number;
}

export interface SavedDesign {
  readonly summary: DesignSummary;
  readonly design: Design;
}

/**
 * Why saving or opening failed:
 * - `unavailable`: there is no server, for example when the app runs locally on the PC;
 * - `signedOut`: the Access login has expired; reloading the page signs in again;
 * - `tooLarge`: the design (usually the drawing) is too big to save;
 * - `notConfigured`: the server is not set up yet (the Access audience is missing), so nobody can save;
 * - `failed`: anything else, such as no internet.
 */
export type RepositoryErrorKind = 'unavailable' | 'signedOut' | 'tooLarge' | 'notConfigured' | 'failed';

export class RepositoryError extends Error {
  readonly kind: RepositoryErrorKind;

  constructor(kind: RepositoryErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** The designs of the signed-in account. Methods throw RepositoryError. */
export interface DesignRepository {
  list(): Promise<readonly DesignSummary[]>;
  open(id: string): Promise<SavedDesign>;
  save(id: string, design: Design, favorite: boolean): Promise<DesignSummary>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  remove(id: string): Promise<void>;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Talks to the Worker API (`src/worker/api.ts`) on the same address. */
export function httpDesignRepository(fetchFn: Fetch): DesignRepository {
  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    let response: Response;
    try {
      // Manual redirects: an expired Access session answers with a redirect to the login page.
      response = await fetchFn(`/api/designs${path}`, { ...init, credentials: 'same-origin', redirect: 'manual' });
    } catch {
      throw new RepositoryError('failed', 'Network error.');
    }
    if (response.type === 'opaqueredirect' || response.status === 401 || (response.status >= 300 && response.status < 400)) {
      throw new RepositoryError('signedOut', 'Not signed in.');
    }
    if (response.status === 503 && (response.headers.get('content-type') ?? '').includes('application/json')) throw new RepositoryError('notConfigured', 'Server is not set up.');
    if (response.status === 413) throw new RepositoryError('tooLarge', 'Design is too large.');
    if (response.status === 204) return response;
    // Without the Worker (locally) the address gives the app page or a 404, not JSON.
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) throw new RepositoryError('unavailable', 'No designs server.');
    if (!response.ok) throw new RepositoryError('failed', `Server answered ${response.status}.`);
    return response;
  };

  return {
    async list() {
      const body = (await (await call('')).json()) as { designs: readonly DesignSummary[] };
      return body.designs;
    },
    async open(id) {
      const { design, ...summary } = (await (await call(`/${id}`)).json()) as DesignSummary & { design: unknown };
      try {
        return { summary, design: parseDesign(design) };
      } catch {
        throw new RepositoryError('failed', 'Saved design is damaged.');
      }
    },
    async save(id, design, favorite) {
      const response = await call(`/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ design, favorite }) });
      return (await response.json()) as DesignSummary;
    },
    async setFavorite(id, favorite) {
      await call(`/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ favorite }) });
    },
    async remove(id) {
      await call(`/${id}`, { method: 'DELETE' });
    },
  };
}
