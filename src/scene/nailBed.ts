import type { Object3D } from 'three';
import type { Finger } from '../core';

/**
 * The nail bed of one finger, measured on the hand model, in metres. Coordinates are in the frame of the anchor node:
 * x across the nail, y from the cuticle towards the tip, z up from the nail.
 */
export interface NailBed {
  /** Width of the nail. */
  readonly width: number;
  /** Length of the nail bed, from the cuticle to the fingertip end of the nail plate. */
  readonly length: number;
  /** Height of the nail surface: `gx·x + gy·y + gxx·x² + gxy·x·y + gyy·y²`. */
  readonly curve: { readonly gx: number; readonly gy: number; readonly gxx: number; readonly gxy: number; readonly gyy: number };
}

/** Node names of the nail anchors in `hand.glb`: one empty per finger, a child of the last finger bone. */
export const NAIL_ANCHOR_NAMES: Readonly<Record<Finger, string>> = {
  thumb: 'NailBed_Thumb',
  index: 'NailBed_Index',
  middle: 'NailBed_Middle',
  ring: 'NailBed_Ring',
  little: 'NailBed_Pinky',
};

/** Reads the nail bed from the custom properties (`extras`) of an anchor node. Throws if one is missing or not a finite number. */
export function readNailBed(extras: Readonly<Record<string, unknown>>): NailBed {
  const number = (key: string): number => {
    const value = extras[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Nail anchor property "${key}" must be a finite number.`);
    return value;
  };
  const length = number('bedLength');
  const width = number('nailWidth');
  if (length <= 0 || width <= 0) throw new RangeError('Nail anchor width and bed length must be positive.');
  return { width, length, curve: { gx: number('gx'), gy: number('gy'), gxx: number('gxx'), gxy: number('gxy'), gyy: number('gyy') } };
}

/** An anchor node of the hand and the nail bed measured there. */
export interface NailAnchor {
  readonly node: Object3D;
  readonly bed: NailBed;
}

/** Finds the nail anchor of every finger below `root`. Throws if one is missing. */
export function findNailAnchors(root: Object3D): Readonly<Record<Finger, NailAnchor>> {
  const find = (finger: Finger): NailAnchor => {
    const node = root.getObjectByName(NAIL_ANCHOR_NAMES[finger]);
    if (!node) throw new Error(`Hand model has no nail anchor "${NAIL_ANCHOR_NAMES[finger]}".`);
    return { node, bed: readNailBed(node.userData) };
  };
  return { thumb: find('thumb'), index: find('index'), middle: find('middle'), ring: find('ring'), little: find('little') };
}
