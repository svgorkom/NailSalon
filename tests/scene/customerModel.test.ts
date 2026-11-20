import { describe, expect, it } from 'vitest';
import { FINGERS } from '../../src/core';
import { NAIL_ANCHOR_NAMES, readNailBed } from '../../src/scene/nailBed';
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

/** The JSON chunk of a binary glTF file, read as text: it runs from byte 20 to the last closing brace before the binary chunk. */
function readGltf(file: string): Gltf {
  const end = file.lastIndexOf('}', file.indexOf('BIN\0', 20));
  return JSON.parse(file.slice(20, end + 1)) as Gltf;
}

const files = import.meta.glob<string>('../../public/assets/customers/*.glb', { query: '?raw', import: 'default', eager: true });
const customers = Object.entries(files).map(([path, file]) => ({ id: path.slice(path.lastIndexOf('/') + 1, -'.glb'.length), gltf: readGltf(file) }));
const hand = readGltf(handFile);

describe('customer models', () => {
  it('are the six of the manifest', () => {
    expect(customers.map((customer) => customer.id).sort()).toEqual(['emma', 'fatima', 'lotte', 'mei', 'noor', 'ria']);
  });

  describe.each(customers)('$id', ({ gltf }) => {
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
