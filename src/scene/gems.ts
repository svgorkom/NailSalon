import { type BufferGeometry, ExtrudeGeometry, LatheGeometry, Quaternion, Shape, SphereGeometry, Vector2, Vector3 } from 'three';
import { GEM_KINDS, type GemKind } from '../core';
import { GEM_OUTLINES, type Outline } from './gemOutlines';
import type { SurfaceFrame } from './nailGeometry';

/**
 * Gem geometries are one unit wide, stand on z = 0 and rise along +z, so the scene scales them by the gem diameter
 * and puts them on the nail surface. Original shapes made in code, so no asset licence applies.
 */

/** A round rhinestone: a flat-backed brilliant with a table on top. Flat shading turns the segments into facets. */
function diamond(): BufferGeometry {
  const profile = [
    [0.001, 0],
    [0.5, 0],
    [0.5, 0.06],
    [0.36, 0.26],
    [0.22, 0.32],
    [0.001, 0.32],
  ].map(([r, h]) => new Vector2(r, h));
  return new LatheGeometry(profile, 12).rotateX(Math.PI / 2);
}

/** A half pearl: a dome that is a bit flatter than a sphere. */
function pearl(): BufferGeometry {
  return new SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.8);
}

/** Bevel of the faceted rhinestones: it widens the outline by `BEVEL_SIZE` on every side. */
const BEVEL_THICKNESS = 0.16;
const BEVEL_SIZE = 0.1;

/** A rhinestone cut from a flat shape, with bevelled, faceted edges. The bevel widens it, so the shape starts smaller. */
function faceted(shape: Shape): BufferGeometry {
  return new ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: BEVEL_THICKNESS, bevelSize: BEVEL_SIZE, bevelSegments: 1, curveSegments: 10 }).translate(0, 0, BEVEL_THICKNESS);
}

/** A heart-shaped rhinestone. The point faces the cuticle, as the heart sticker on the pad. */
function heart(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(0, -0.38);
  shape.bezierCurveTo(-0.5, 0, -0.36, 0.42, -0.14, 0.36);
  shape.bezierCurveTo(-0.05, 0.33, 0, 0.26, 0, 0.2);
  shape.bezierCurveTo(0, 0.26, 0.05, 0.33, 0.14, 0.36);
  shape.bezierCurveTo(0.36, 0.42, 0.5, 0, 0, -0.38);
  return faceted(shape);
}

/** A rhinestone in the shape of a flat outline: square, drop or star. Sharp corners bevel wider, so it is fitted to one unit. */
function cut(outline: Outline): BufferGeometry {
  const inset = 1 - 2 * BEVEL_SIZE;
  const geometry = faceted(new Shape(outline.map(([x, y]) => new Vector2(x * inset, y * inset))));
  geometry.computeBoundingBox();
  const width = geometry.boundingBox ? geometry.boundingBox.max.x - geometry.boundingBox.min.x : 1;
  return geometry.scale(1 / width, 1 / width, 1);
}

function geometryFor(kind: GemKind): BufferGeometry {
  const outline = GEM_OUTLINES[kind];
  if (outline !== undefined) return cut(outline);
  return kind === 'diamond' ? diamond() : kind === 'pearl' ? pearl() : heart();
}

/** One geometry per gem kind, shared by all gems. The caller disposes them. */
export function createGemGeometries(): Readonly<Record<GemKind, BufferGeometry>> {
  return Object.fromEntries(GEM_KINDS.map((kind) => [kind, geometryFor(kind)])) as Record<GemKind, BufferGeometry>;
}

export interface GemMaterial {
  readonly metalness: number;
  readonly roughness: number;
  readonly clearcoat: number;
  readonly iridescence: number;
  readonly sheen: number;
  readonly flatShading: boolean;
  /** How much light passes through (0 is solid), its refraction index and the glass thickness as a fraction of the gem width. */
  readonly transmission: number;
  readonly ior: number;
  readonly thickness: number;
}

const RHINESTONE: GemMaterial = { metalness: 0.35, roughness: 0.08, clearcoat: 1, iridescence: 0.6, sheen: 0, flatShading: true, transmission: 0, ior: 1.5, thickness: 0 };

/** Rhinestones are foil-backed glass: coloured facets that catch the light with a hint of rainbow. Pearls glow softly. */
export const GEM_MATERIALS: Readonly<Record<GemKind, GemMaterial>> = {
  diamond: RHINESTONE,
  heart: RHINESTONE,
  square: RHINESTONE,
  drop: RHINESTONE,
  star: RHINESTONE,
  pearl: { metalness: 0, roughness: 0.3, clearcoat: 1, iridescence: 0.8, sheen: 1, flatShading: false, transmission: 0, ior: 1.5, thickness: 0 },
};

/** Any gem in clear glass: the nail shows through, bent by the facets, tinted by the gem colour. */
export const CLEAR_GEM: GemMaterial = { metalness: 0, roughness: 0.02, clearcoat: 1, iridescence: 0.4, sheen: 0, flatShading: true, transmission: 1, ior: 2, thickness: 0.3 };

const UP = new Vector3(0, 0, 1);

/**
 * Turns a gem so that it stands on the surface, rotated about the surface normal by `rotation` degrees clockwise as seen
 * on the pad. The pad looks at the nail from above with the free edge at the top, so clockwise there is negative about +z.
 */
export function gemOrientation(frame: SurfaceFrame, rotation: number): readonly [number, number, number, number] {
  const spin = new Quaternion().setFromAxisAngle(UP, (-rotation * Math.PI) / 180);
  const tilt = new Quaternion().setFromUnitVectors(UP, new Vector3(...frame.normal));
  const { x, y, z, w } = tilt.multiply(spin);
  return [x, y, z, w];
}
