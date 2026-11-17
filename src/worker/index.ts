/**
 * The Cloudflare Worker. Static files are served by Workers static assets; only `/api/*` reaches this code
 * (`run_worker_first` in wrangler.jsonc). Every API request must carry a valid Cloudflare Access token.
 */
import { AccessConfigError, AccessError, cachedKeySource, verifyAccessToken } from './access';
import { handleApi, problem } from './api';
import { type D1Like, d1Store, type DesignStore } from './store';

interface Env {
  readonly DB: D1Like;
  readonly ACCESS_TEAM_DOMAIN: string;
  readonly ACCESS_AUD: string;
}

const keys = cachedKeySource(async (url) => (await fetch(url)).json(), () => Date.now());

/** One store per database binding, so the table check runs once per Worker instance. */
const stores = new WeakMap<D1Like, DesignStore>();
function storeFor(db: D1Like): DesignStore {
  let store = stores.get(db);
  if (store === undefined) {
    store = d1Store(db);
    stores.set(db, store);
  }
  return store;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let owner: string;
    try {
      owner = await verifyAccessToken(request.headers.get('cf-access-jwt-assertion'), { teamDomain: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD }, keys, Date.now());
    } catch (error) {
      if (error instanceof AccessError) return problem(401, error.message);
      if (error instanceof AccessConfigError) return problem(503, error.message);
      throw error;
    }
    return handleApi(request, { store: storeFor(env.DB), owner, now: Date.now() });
  },
};
