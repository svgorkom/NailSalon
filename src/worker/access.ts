/**
 * Checks the token Cloudflare Access puts on every request it lets through (`Cf-Access-Jwt-Assertion`),
 * so the API never trusts a request that did not pass the Access login.
 */

export interface AccessConfig {
  /** For example `https://shiny-frog-e9d5.cloudflareaccess.com`. */
  readonly teamDomain: string;
  /** The Application Audience (AUD) tag of the Access application. */
  readonly audience: string;
}

/** A public key from the team's certs endpoint. */
export type AccessKey = JsonWebKey & { readonly kid?: string };

/** Fetches the team's public keys; injected so tests need no network. */
export type KeySource = (teamDomain: string) => Promise<readonly AccessKey[]>;

export class AccessError extends Error {}

/** The Worker itself is not set up (no team domain or audience): a server problem, not a login problem. */
export class AccessConfigError extends Error {}

/** Returns the e-mail address of the signed-in user, or throws AccessError (login problem) or AccessConfigError (server not set up). `now` is in milliseconds. */
export async function verifyAccessToken(token: string | null, config: AccessConfig, keys: KeySource, now: number): Promise<string> {
  if (config.teamDomain === '' || config.audience === '') throw new AccessConfigError('Access is not configured.');
  if (token === null || token === '') throw new AccessError('No Access token.');
  const parts = token.split('.');
  const [head, body, signature] = parts;
  if (parts.length !== 3 || head === undefined || body === undefined || signature === undefined) throw new AccessError('Malformed token.');

  const header = decodeJson(head);
  if (header.alg !== 'RS256') throw new AccessError('Unexpected algorithm.');
  const key = (await keys(config.teamDomain)).find(({ kid }) => kid === header.kid);
  if (key === undefined) throw new AccessError('Unknown signing key.');
  const publicKey = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, base64UrlBytes(signature), new TextEncoder().encode(`${head}.${body}`));
  if (!valid) throw new AccessError('Bad signature.');

  const claims = decodeJson(body);
  const seconds = now / 1000;
  if (typeof claims.exp !== 'number' || claims.exp <= seconds) throw new AccessError('Token expired.');
  if (typeof claims.nbf === 'number' && claims.nbf > seconds) throw new AccessError('Token not valid yet.');
  if (claims.iss !== config.teamDomain) throw new AccessError('Wrong issuer.');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(config.audience)) throw new AccessError('Wrong audience.');
  if (typeof claims.email !== 'string' || claims.email === '') throw new AccessError('No e-mail in token.');
  return claims.email.toLowerCase();
}

/** Keys from `<team>/cdn-cgi/access/certs`, kept for an hour per Worker instance. */
export function cachedKeySource(fetchJson: (url: string) => Promise<unknown>, clock: () => number): KeySource {
  let cached: { readonly at: number; readonly keys: readonly AccessKey[] } | null = null;
  return async (teamDomain) => {
    if (cached !== null && clock() - cached.at < 3_600_000) return cached.keys;
    const result = (await fetchJson(`${teamDomain}/cdn-cgi/access/certs`)) as { keys?: readonly AccessKey[] };
    const keys = Array.isArray(result.keys) ? result.keys : [];
    cached = { at: clock(), keys };
    return keys;
  };
}

function decodeJson(part: string): Readonly<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(base64UrlBytes(part)));
    if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  } catch {
    // Reported below.
  }
  throw new AccessError('Malformed token.');
}

function base64UrlBytes(part: string): Uint8Array<ArrayBuffer> {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new AccessError('Malformed token.');
  }
}
