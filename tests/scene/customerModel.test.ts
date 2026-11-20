import { describe, expect, it } from 'vitest';
import { FINGERS } from '../../src/core';
import { NAIL_ANCHOR_NAMES, readNailBed } from '../../src/scene/nailBed';
import customerFile from '../../public/assets/customers/proto/customer-proto.glb?raw';
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

const customer = readGltf(customerFile);
const hand = readGltf(handFile);

describe('customer model', () => {
  it.each(FINGERS)('has a nail anchor for the %s that the nail code can read', (digit) => {
    const node = customer.nodes.find((candidate) => candidate.name === NAIL_ANCHOR_NAMES[digit]);
    expect(node?.extras).toBeDefined();
    const bed = readNailBed(node?.extras ?? {});
    // A real nail: between 5 and 20 mm wide.
    expect(bed.width).toBeGreaterThan(0.005);
    expect(bed.width).toBeLessThan(0.02);
  });

  it('gives its anchors the same properties as the hand model', () => {
    const keys = (gltf: Gltf) => Object.keys(gltf.nodes.find((node) => node.name === 'NailBed_Index')?.extras ?? {}).sort();
    expect(keys(customer)).toEqual(keys(hand));
  });

  it('has the skin material the tint is applied to', () => {
    expect(customer.materials.map((material) => material.name)).toContain('Skin');
  });
});
