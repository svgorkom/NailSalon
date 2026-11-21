import { describe, expect, it } from 'vitest';
import { FINGERS, TOES } from '../../src/core';
import { NAIL_ANCHOR_NAMES, readNailBed } from '../../src/scene/nailBed';
import footFile from '../../public/assets/foot/foot.glb?raw';
import handFile from '../../public/assets/hand/hand.glb?raw';

interface GltfNode {
  readonly name?: string;
  readonly extras?: Record<string, unknown>;
}
interface Gltf {
  readonly nodes: readonly GltfNode[];
  readonly materials: readonly { readonly name?: string }[];
  readonly skins?: readonly { readonly joints: readonly number[] }[];
}

/**
 * The JSON chunk of a binary glTF file, read as text: it runs from the first opening brace after the "JSON" chunk tag to the last closing brace
 * before the binary chunk. (The header has binary lengths, so no fixed byte offsets: decoding them as text changes their width.)
 */
function readGltf(file: string): Gltf {
  const start = file.indexOf('{', file.indexOf('JSON'));
  const end = file.lastIndexOf('}', file.indexOf('BIN\0', start));
  return JSON.parse(file.slice(start, end + 1)) as Gltf;
}

const files = import.meta.glob<string>('../../public/assets/customers/*.glb', { query: '?raw', import: 'default', eager: true });
const customers = Object.entries(files).map(([path, file]) => {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.glb'.length);
  return { id, part: id.endsWith('-foot') ? ('foot' as const) : ('hand' as const), gltf: readGltf(file) };
});
const hand = readGltf(handFile);
const foot = readGltf(footFile);
const handCustomers = customers.filter((customer) => customer.part === 'hand');
const footCustomers = customers.filter((customer) => customer.part === 'foot');

describe('customer models', () => {
  it('are the six of the manifest, and the pedicure customers', () => {
    expect(handCustomers.map((customer) => customer.id).sort()).toEqual(['emma', 'fatima', 'lotte', 'mei', 'noor', 'ria']);
    expect(footCustomers.map((customer) => customer.id)).toEqual(['emma-foot']);
  });

  describe.each(footCustomers)('$id', ({ gltf }) => {
    it.each(TOES)('has a nail anchor for the %s that the nail code can read', (digit) => {
      const node = gltf.nodes.find((candidate) => candidate.name === NAIL_ANCHOR_NAMES[digit]);
      expect(node?.extras).toBeDefined();
      const bed = readNailBed(node?.extras ?? {});
      // A real toenail: between 5 and 20 mm wide.
      expect(bed.width).toBeGreaterThan(0.005);
      expect(bed.width).toBeLessThan(0.02);
    });

    it('gives its anchors the same properties as the foot model', () => {
      const keys = (model: Gltf) => Object.keys(model.nodes.find((node) => node.name === 'NailBed_BigToe')?.extras ?? {}).sort();
      expect(keys(gltf)).toEqual(keys(foot));
    });

    it('has the skin material the tint is applied to', () => {
      expect(gltf.materials.map((material) => material.name)).toContain('Skin');
    });
  });

  describe.each(handCustomers)('$id', ({ gltf }) => {
    it.each(FINGERS)('has a nail anchor for the %s that the nail code can read', (digit) => {
      const node = gltf.nodes.find((candidate) => candidate.name === NAIL_ANCHOR_NAMES[digit]);
      expect(node?.extras).toBeDefined();
      const bed = readNailBed(node?.extras ?? {});
      // A real nail: between 4.5 and 20 mm wide.
      expect(bed.width).toBeGreaterThan(0.0045);
      expect(bed.width).toBeLessThan(0.02);
    });

    it('gives its anchors the same properties as the hand model', () => {
      const keys = (model: Gltf) => Object.keys(model.nodes.find((node) => node.name === 'NailBed_Index')?.extras ?? {}).sort();
      expect(keys(gltf)).toEqual(keys(hand));
    });

    it('has the skin material the tint is applied to', () => {
      expect(gltf.materials.map((material) => material.name)).toContain('Skin');
    });
  });
});
