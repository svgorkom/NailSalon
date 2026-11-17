import { type Design, type Digit, FINGERS, type FrenchTip, type Gem, type Nail, nailAt, type Sticker, type Stroke, TOES } from '../core';
import { GEM_OUTLINES } from './gemOutlines';
import { STICKER_PATHS } from './stickerShapes';

/** Size of the texture of one nail. Positions in the design are fractions of these. */
export const TEXTURE_WIDTH = 512;
export const TEXTURE_HEIGHT = 640;

/**
 * Guide outline drawn on the pad: straight sides, a round free edge at the top and a slightly rounded cuticle
 * edge at the bottom. The texture itself is not clipped; the 3D nail takes its outline from the nail shape.
 */
export function traceNailOutline(ctx: CanvasRenderingContext2D): void {
  const half = TEXTURE_WIDTH / 2;
  const cuticle = TEXTURE_WIDTH * 0.12;
  ctx.beginPath();
  ctx.roundRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT, [half, half, cuticle, cuticle]);
}

/** A small, fast random generator (mulberry32). The same seed always gives the same numbers, which is what makes sponge marks repeatable. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Number of small pores in one sponge dab, and how much of the colour the soft body of the dab gets. */
const SPONGE_PORES = 110;
const SPONGE_BODY = 0.45;

/**
 * Draws dab number `index` of a sponge stroke: a soft round body with a speckle of pores, a different pattern for each
 * dab. The pattern depends only on the stroke's seed and the index, so replaying a stroke gives the same marks. Dabs on
 * top of each other add up, which is what makes a gradient.
 */
export function paintDab(ctx: CanvasRenderingContext2D, stroke: Stroke, index: number): void {
  const { sponge, points } = stroke;
  if (sponge === undefined) return;
  const random = randomFrom(Math.imul(sponge.seed, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b));
  const radius = (stroke.size * TEXTURE_WIDTH) / 2;
  const x = (points[index * 2] ?? 0) * TEXTURE_WIDTH;
  const y = (points[index * 2 + 1] ?? 0) * TEXTURE_HEIGHT;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const body = ctx.createRadialGradient(x, y, 0, x, y, radius);
  body.addColorStop(0, stroke.color);
  body.addColorStop(0.5, stroke.color);
  body.addColorStop(1, `${stroke.color}00`);
  ctx.globalAlpha = sponge.opacity * SPONGE_BODY;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = stroke.color;
  for (let pore = 0; pore < SPONGE_PORES; pore++) {
    const angle = random() * Math.PI * 2;
    const reach = Math.sqrt(random());
    const size = radius * (0.025 + 0.055 * random());
    // Pores near the edge are fainter, so the dab fades out instead of ending in a hard circle.
    ctx.globalAlpha = sponge.opacity * (0.25 + 0.45 * random()) * (1 - reach * reach);
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * reach * radius, y + Math.sin(angle) * reach * radius, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws one stroke. An eraser stroke removes what is already on the surface; a sponge stroke is a series of dabs. */
export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const { points } = stroke;
  if (stroke.sponge !== undefined) {
    for (let index = 0; index < points.length / 2; index++) paintDab(ctx, stroke, index);
    return;
  }
  const radius = (stroke.size * TEXTURE_WIDTH) / 2;
  ctx.save();
  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
  ctx.fillStyle = stroke.color;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const x = (index: number) => (points[index] ?? 0) * TEXTURE_WIDTH;
  const y = (index: number) => (points[index + 1] ?? 0) * TEXTURE_HEIGHT;
  if (points.length === 2) {
    ctx.beginPath();
    ctx.arc(x(0), y(0), radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    for (let index = 2; index < points.length; index += 2) ctx.lineTo(x(index), y(index));
    ctx.stroke();
  }
  ctx.restore();
}

const pathCache = new Map<string, Path2D>();

function stickerPath(kind: Sticker['kind']): Path2D {
  let path = pathCache.get(kind);
  if (path === undefined) {
    path = new Path2D(STICKER_PATHS[kind]);
    pathCache.set(kind, path);
  }
  return path;
}

export function paintSticker(ctx: CanvasRenderingContext2D, sticker: Sticker): void {
  ctx.save();
  ctx.translate(sticker.x * TEXTURE_WIDTH, sticker.y * TEXTURE_HEIGHT);
  ctx.rotate((sticker.rotation * Math.PI) / 180);
  ctx.scale((sticker.size * TEXTURE_WIDTH) / 100, (sticker.size * TEXTURE_WIDTH) / 100);
  ctx.fillStyle = sticker.color;
  ctx.fill(stickerPath(sticker.kind));
  ctx.restore();
}

/** A clear gem shows on the pad as a see-through shape. */
const CLEAR_GEM_ALPHA = 0.4;

/**
 * A flat picture of a gem for the drawing pad: its shape in its colour with a white glint. The 3D nail shows the gem
 * itself, so this is never painted on the nail texture.
 */
export function paintGem(ctx: CanvasRenderingContext2D, gem: Gem): void {
  const radius = (gem.size * TEXTURE_WIDTH) / 2;
  ctx.save();
  ctx.translate(gem.x * TEXTURE_WIDTH, gem.y * TEXTURE_HEIGHT);
  ctx.rotate((gem.rotation * Math.PI) / 180);
  ctx.globalAlpha = gem.clear ? CLEAR_GEM_ALPHA : 1;
  ctx.fillStyle = gem.color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = Math.max(1, radius / 10);
  const outline = GEM_OUTLINES[gem.kind];
  if (gem.kind === 'heart') {
    ctx.save();
    ctx.scale(radius / 50, radius / 50);
    ctx.fill(stickerPath('heart'));
    ctx.restore();
  } else if (outline !== undefined) {
    // The outline has y towards the free edge, which is up on the pad.
    ctx.beginPath();
    outline.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(2 * radius * x, -2 * radius * y) : ctx.lineTo(2 * radius * x, -2 * radius * y)));
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (gem.kind === 'diamond') {
    // The table and the facets running from it to the rim.
    const table = radius * 0.45;
    ctx.beginPath();
    for (let index = 0; index < 8; index++) {
      const angle = (Math.PI * index) / 4;
      ctx.moveTo(table * Math.cos(angle), table * Math.sin(angle));
      ctx.lineTo(radius * Math.cos(angle + Math.PI / 8), radius * Math.sin(angle + Math.PI / 8));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The smile line of a French tip lies this much closer to the free edge in the middle than at the sides. */
const SMILE = 0.35;

/**
 * Paints a French tip: the top of the texture (the free edge) down to `depth`, ending in a smile line that is deepest
 * at the sides of the nail.
 */
export function paintFrenchTip(ctx: CanvasRenderingContext2D, french: FrenchTip): void {
  const side = french.depth * TEXTURE_HEIGHT;
  const middle = side * (1 - SMILE);
  ctx.save();
  ctx.fillStyle = french.color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(TEXTURE_WIDTH, 0);
  ctx.lineTo(TEXTURE_WIDTH, side);
  // A quadratic curve passes its control point halfway, so this one reaches `middle` in the centre.
  ctx.quadraticCurveTo(TEXTURE_WIDTH / 2, 2 * middle - side, 0, side);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Puts a nail together: base colour, then the French tip, then the drawing layer, then the stickers.
 * Gems are not painted; the scene shows them as 3D objects.
 */
export function paintNail(ctx: CanvasRenderingContext2D, nail: Nail, drawing: CanvasImageSource): void {
  ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  ctx.save();
  ctx.fillStyle = nail.color;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  if (nail.french !== null) paintFrenchTip(ctx, nail.french);
  ctx.drawImage(drawing, 0, 0);
  for (const sticker of nail.stickers) paintSticker(ctx, sticker);
  ctx.restore();
}

interface Surface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
}

function createSurface(createCanvas: () => HTMLCanvasElement): Surface {
  const canvas = createCanvas();
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('A 2D canvas is not available.');
  return { canvas, ctx };
}

/**
 * The live texture of each nail. The 3D scene and the drawing pad both show the canvas of a nail; this class
 * keeps it up to date. Strokes that are still being drawn go straight onto the canvas, so no React state
 * changes per pointer move.
 */
export class NailPaint {
  private readonly layers = new Map<Digit, Surface>();
  private readonly outputs = new Map<Digit, Surface>();
  /** The nail each canvas shows; null when it shows something that is not (yet) in the design. */
  private readonly painted = new Map<Digit, Nail | null>();
  private readonly listeners = new Set<(digit: Digit) => void>();

  constructor(private readonly createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {}

  /** The canvas that shows the nail. It stays the same object for the life of this NailPaint. */
  canvas(digit: Digit): HTMLCanvasElement {
    return this.surface(this.outputs, digit).canvas;
  }

  /** Calls the listener each time the canvas of a nail changes. Returns the function that stops it. */
  subscribe(listener: (digit: Digit) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Repaints the nails that no longer show what the design says. */
  sync(design: Design): void {
    for (const digit of [...FINGERS, ...TOES]) {
      const nail = nailAt(design, digit);
      if (this.painted.get(digit) !== nail) this.repaint(digit, nail);
    }
  }

  /** Adds the newest piece of a stroke that is still being drawn to these nails. The design does not change. */
  extendStroke(design: Design, digits: readonly Digit[], stroke: Stroke): void {
    // A line needs its last two points; a sponge stroke only adds the newest dab, which keeps its own index in the stroke.
    const dab = stroke.points.length / 2 - 1;
    const newest: Stroke = { ...stroke, points: stroke.points.slice(-4) };
    for (const digit of digits) {
      const { ctx } = this.surface(this.layers, digit);
      if (stroke.sponge === undefined) paintStroke(ctx, newest);
      else paintDab(ctx, stroke, dab);
      this.compose(digit, nailAt(design, digit));
      this.painted.set(digit, null);
    }
  }

  /** Shows a nail with a changed sticker, for example while it is dragged. The design does not change. */
  preview(digit: Digit, nail: Nail): void {
    this.compose(digit, nail);
    this.painted.set(digit, null);
  }

  private repaint(digit: Digit, nail: Nail): void {
    const { ctx } = this.surface(this.layers, digit);
    ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    for (const stroke of nail.strokes) paintStroke(ctx, stroke);
    this.compose(digit, nail);
    this.painted.set(digit, nail);
  }

  private compose(digit: Digit, nail: Nail): void {
    paintNail(this.surface(this.outputs, digit).ctx, nail, this.surface(this.layers, digit).canvas);
    for (const listener of this.listeners) listener(digit);
  }

  private surface(surfaces: Map<Digit, Surface>, digit: Digit): Surface {
    let surface = surfaces.get(digit);
    if (surface === undefined) {
      surface = createSurface(this.createCanvas);
      surfaces.set(digit, surface);
    }
    return surface;
  }
}
