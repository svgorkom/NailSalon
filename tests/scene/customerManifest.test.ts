import { describe, expect, it } from 'vitest';
import { parseManifest } from '../../src/scene/customerManifest';
import manifestFile from '../../public/assets/customers/manifest.json';

const entry = { id: 'emma', part: 'hand', name: 'Emma', file: 'emma.glb', bytes: 1000, skin: '#e9b9a0', about: 'Tekst.' };

describe('parseManifest', () => {
  it('reads customers', () => {
    expect(parseManifest({ customers: [entry] })).toEqual([entry]);
  });

  it('takes a hand when no part is given, and reads a foot', () => {
    const withoutPart: Record<string, unknown> = { ...entry };
    delete withoutPart.part;
    expect(parseManifest({ customers: [withoutPart] })[0]?.part).toBe('hand');
    expect(parseManifest({ customers: [{ ...entry, id: 'emma-foot', part: 'foot' }] })[0]?.part).toBe('foot');
    expect(() => parseManifest({ customers: [{ ...entry, part: 'knee' }] })).toThrow(TypeError);
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

  it('accepts the manifest of the repo: six hand customers and a pedicure customer, each within the 2.5 MB budget', () => {
    const customers = parseManifest(manifestFile);
    expect(customers.filter((customer) => customer.part === 'hand')).toHaveLength(6);
    expect(customers.filter((customer) => customer.part === 'foot').map((customer) => customer.id)).toEqual(['emma-foot']);
    for (const customer of customers) expect(customer.bytes).toBeLessThanOrEqual(2.5 * 1024 * 1024);
  });
});
