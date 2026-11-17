import { beforeAll, describe, expect, it } from 'vitest';
import { AccessConfigError, type AccessKey, AccessError, cachedKeySource, verifyAccessToken } from '../../src/worker/access';

const config = { teamDomain: 'https://team.cloudflareaccess.com', audience: 'aud-tag' };
const NOW = 1_800_000_000_000;

let signer: CryptoKey;
let publicKey: AccessKey;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encode = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

async function token(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256', kid: 'k1' }): Promise<string> {
  const unsigned = `${encode(header)}.${encode(claims)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

const valid = { iss: config.teamDomain, aud: ['aud-tag'], email: 'Fleur@Example.com', exp: NOW / 1000 + 60 };
const keys = async () => [publicKey];

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  signer = pair.privateKey;
  publicKey = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
});

describe('verifyAccessToken', () => {
  it('returns the e-mail address in lower case', async () => {
    await expect(verifyAccessToken(await token(valid), config, keys, NOW)).resolves.toBe('fleur@example.com');
  });

  it.each([
    ['an expired token', { ...valid, exp: NOW / 1000 - 1 }],
    ['another audience', { ...valid, aud: ['other'] }],
    ['another issuer', { ...valid, iss: 'https://evil.cloudflareaccess.com' }],
    ['no e-mail', { ...valid, email: undefined }],
  ])('rejects %s', async (_, claims) => {
    await expect(verifyAccessToken(await token(claims), config, keys, NOW)).rejects.toThrow(AccessError);
  });

  it('rejects a changed token', async () => {
    const [head, , signature] = (await token(valid)).split('.');
    const forged = `${head}.${encode({ ...valid, email: 'someone@example.com' })}.${signature}`;
    await expect(verifyAccessToken(forged, config, keys, NOW)).rejects.toThrow(AccessError);
  });

  it('rejects an unknown key, another algorithm, garbage and a missing token', async () => {
    await expect(verifyAccessToken(await token(valid, { alg: 'RS256', kid: 'k2' }), config, keys, NOW)).rejects.toThrow(AccessError);
    await expect(verifyAccessToken(await token(valid, { alg: 'none', kid: 'k1' }), config, keys, NOW)).rejects.toThrow(AccessError);
    await expect(verifyAccessToken('a.b.c', config, keys, NOW)).rejects.toThrow(AccessError);
    await expect(verifyAccessToken(null, config, keys, NOW)).rejects.toThrow(AccessError);
  });

  it('refuses everything while the audience is not configured', async () => {
    await expect(verifyAccessToken(await token(valid), { ...config, audience: '' }, keys, NOW)).rejects.toThrow(AccessConfigError);
  });
});

describe('cachedKeySource', () => {
  it('fetches the certs once an hour', async () => {
    const urls: string[] = [];
    let now = 0;
    const source = cachedKeySource(
      async (url) => {
        urls.push(url);
        return { keys: [{ kid: 'k1' }] };
      },
      () => now,
    );
    await source(config.teamDomain);
    now = 3_599_999;
    await source(config.teamDomain);
    now = 3_600_000;
    expect(await source(config.teamDomain)).toEqual([{ kid: 'k1' }]);
    expect(urls).toEqual([`${config.teamDomain}/cdn-cgi/access/certs`, `${config.teamDomain}/cdn-cgi/access/certs`]);
  });
});
