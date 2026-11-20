import { describe, expect, it } from 'vitest';
import { parseManifest } from '../../src/scene/customerManifest';
import manifestFile from '../../public/assets/customers/manifest.json';

const entry = { id: 'emma', name: 'Emma', file: 'emma.glb', bytes: 1000, skin: '#e9b9a0', about: 'Tekst.' };

describe('parseManifest', () => {
  it('reads customers', () => {
    expect(parseManifest({ customers: [entry] })).toEqual([entry]);
  });

  it('rejects an empty list, a missing field and a duplicate id', () => {
    expect(() => parseManifest({ customers: [] })).toThrow(TypeError);
    expect(() => parseManifest({ customers: [{ ...entry, name: '' }] })).toThrow(TypeError);
    expect(() => parseManifest({ customers: [entry, entry] })).toThrow(TypeError);
  });

  it('rejects a skin colour that is not #rrggbb and a size that is not positive', () => {
    expect(() => parseManifest({ customers: [{ ...entry, skin: 'pink' }] })).toThrow(TypeError);
    expect(() => parseManifest({ customers: [{ ...entry, bytes: 0 }] })).toThrow(TypeError);
  });

  it('accepts the manifest of the repo: six customers, each within the 6 MB budget', () => {
    const customers = parseManifest(manifestFile);
    expect(customers).toHaveLength(6);
    for (const customer of customers) expect(customer.bytes).toBeLessThanOrEqual(6 * 1024 * 1024);
  });
});
