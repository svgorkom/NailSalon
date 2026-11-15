import { BufferAttribute, BufferGeometry } from 'three';
import { freeEdgeRatio, type NailShape, tipWidth } from '../core';
import type { NailBed } from './nailBed';

/** Points across the nail, rows over the nail bed and rows over the free edge. */
const COLUMNS = 13;
const BED_ROWS = 10;
const FREE_ROWS = 20;
/** Thickness of the nail plate and how far its top lies above the skin, in metres. */
const THICKNESS = 0.0005;
const LIFT = 0.0006;
/** The cuticle edge curves along the nail over this fraction of the nail bed, and its sides pull in by 22%. */
const CUTICLE_ZONE = 0.45;
const CUTICLE_PULL = 0.22;
/** The free edge bends down, and follows the slope at the nail bed end within these limits. */
const BEND = 9;
const MIN_SLOPE = -0.15;
const MAX_SLOPE = 0.05;
/** Smallest half width, so a pointed tip keeps a valid triangle. */
const MIN_HALF_WIDTH = 2e-5;

export interface NailMesh {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint32Array;
}

/**
 * The mesh of one nail in the frame of its anchor: a thin plate that follows the nail bed and continues as the free edge
 * with the outline of `shape`. u runs across the nail (0..1), v from the cuticle to the tip (0..1).
 * `length` is the nail length from 0 (short) to 1 (extra long).
 */
export function buildNailMesh(shape: NailShape, length: number, bed: NailBed): NailMesh {
  const halfWidth = bed.width / 2;
  const free = bed.length * freeEdgeRatio(length);
  const total = bed.length + free;
  const { gx, gy, gxx, gxy, gyy } = bed.curve;

  const rows: { y: number; s: number }[] = [];
  for (let k = 0; k <= BED_ROWS; k++) rows.push({ y: (bed.length * k) / BED_ROWS, s: 0 });
  for (let k = 1; k <= FREE_ROWS; k++) {
    const s = (k / FREE_ROWS) ** 0.8;
    rows.push({ y: bed.length + free * s, s });
  }

  const gridSize = rows.length * COLUMNS;
  const top = new Float32Array(gridSize * 3);
  const topUv = new Float32Array(gridSize * 2);
  rows.forEach(({ y, s }, r) => {
    const base = Math.min(y / (CUTICLE_ZONE * bed.length), 1);
    const half = Math.max(halfWidth * (1 - CUTICLE_PULL * (1 - base) ** 2) * (s > 0 ? tipWidth(shape, s) : 1), MIN_HALF_WIDTH);
    for (let c = 0; c < COLUMNS; c++) {
      const q = (2 * c) / (COLUMNS - 1) - 1;
      const x = q * half;
      const yCurved = y + CUTICLE_PULL * halfWidth * q * q * (1 - base) ** 3;
      const yBed = Math.min(yCurved, bed.length);
      const beyond = Math.max(yCurved - bed.length, 0);
      const slope = Math.min(Math.max(gy + gxy * x + 2 * gyy * bed.length, MIN_SLOPE), MAX_SLOPE);
      const z = gx * x + gy * yBed + gxx * x * x + gxy * x * yBed + gyy * yBed * yBed + slope * beyond - BEND * beyond * beyond + LIFT;
      const i = r * COLUMNS + c;
      top.set([x, yCurved, z], i * 3);
      topUv.set([(q + 1) / 2, y / total], i * 2);
    }
  });

  // Border of the plate, counter-clockwise seen from above: along the cuticle, up the right side, back along the tip, down the left side.
  const border: number[] = [];
  for (let c = 0; c < COLUMNS; c++) border.push(c);
  for (let r = 1; r < rows.length; r++) border.push(r * COLUMNS + COLUMNS - 1);
  for (let c = COLUMNS - 2; c >= 0; c--) border.push((rows.length - 1) * COLUMNS + c);
  for (let r = rows.length - 2; r >= 1; r--) border.push(r * COLUMNS);

  const wallVertices = border.length * 4;
  const vertexCount = gridSize * 2 + wallVertices;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  positions.set(top, 0);
  uvs.set(topUv, 0);
  for (let i = 0; i < gridSize; i++) {
    positions.set([top[i * 3] ?? 0, top[i * 3 + 1] ?? 0, (top[i * 3 + 2] ?? 0) - THICKNESS], (gridSize + i) * 3);
    uvs.set([topUv[i * 2] ?? 0, topUv[i * 2 + 1] ?? 0], (gridSize + i) * 2);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < COLUMNS - 1; c++) {
      const a = r * COLUMNS + c;
      const b = a + 1;
      const d = a + COLUMNS;
      const e = d + 1;
      indices.push(a, b, e, a, e, d); // top, facing up
      indices.push(gridSize + a, gridSize + d, gridSize + e, gridSize + a, gridSize + e, gridSize + b); // underside, facing down
    }
  }

  // The wall has its own vertices so it shades flat instead of rounding the rim of the plate.
  border.forEach((start, k) => {
    const end = border[(k + 1) % border.length] ?? start;
    const corners = [end, start, gridSize + start, gridSize + end];
    const first = gridSize * 2 + k * 4;
    corners.forEach((source, j) => {
      positions.set(positions.subarray(source * 3, source * 3 + 3), (first + j) * 3);
      uvs.set(uvs.subarray(source * 2, source * 2 + 2), (first + j) * 2);
    });
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  });

  return { positions, uvs, indices: Uint32Array.from(indices) };
}

/** A Three.js geometry of the nail. The caller disposes it. */
export function createNailGeometry(shape: NailShape, length: number, bed: NailBed): BufferGeometry {
  const { positions, uvs, indices } = buildNailMesh(shape, length, bed);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}
