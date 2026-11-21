import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomerEntry } from '../../src/scene/customerManifest';
import { salonEnabled } from '../../src/ui/flags';
import { nextCustomer } from '../../src/ui/salon';

const customer = (id: string): CustomerEntry => ({ id, part: 'hand', name: id, file: `${id}.glb`, bytes: 1, skin: '#e9b9a0', about: '.' });
const [emma, mei, ria] = [customer('emma'), customer('mei'), customer('ria')];

describe('nextCustomer', () => {
  it('picks a customer other than the current one', () => {
    expect(nextCustomer([emma, mei, ria], emma, () => 0)).toBe(mei);
    expect(nextCustomer([emma, mei, ria], emma, () => 0.99)).toBe(ria);
  });

  it('picks from the whole list when nobody is in the chair', () => {
    expect(nextCustomer([emma, mei, ria], null, () => 0)).toBe(emma);
  });

  it('keeps the only customer, and returns null for none', () => {
    expect(nextCustomer([emma], emma, () => 0.5)).toBe(emma);
    expect(nextCustomer([], null, () => 0.5)).toBeNull();
  });
});

describe('salonEnabled', () => {
  // The tests run in Node: a small in-memory storage stands in for the browser's.
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) });
  });

  it('is off by default', () => {
    expect(salonEnabled('')).toBe(false);
  });

  it('is turned on by ?salon=1 and stays on for later visits', () => {
    expect(salonEnabled('?salon=1')).toBe(true);
    expect(salonEnabled('')).toBe(true);
  });

  it('is turned off again by ?salon=0 and ignores other values', () => {
    salonEnabled('?salon=1');
    expect(salonEnabled('?salon=yes')).toBe(true);
    expect(salonEnabled('?salon=0')).toBe(false);
    expect(salonEnabled('')).toBe(false);
  });
});
