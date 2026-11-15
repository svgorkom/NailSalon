import { type Design, type Finger, FINGERS, type Nail, type Sticker, type Stroke } from '../core';
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

/** Draws one stroke. An eraser stroke removes what is already on the surface. */
export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const { points } = stroke;
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

/**
 * Puts a nail together: base colour, then the drawing layer, then the stickers, all inside the outline.
 * Outside the outline the surface stays transparent.
 */
export function paintNail(ctx: CanvasRenderingContext2D, nail: Nail, drawing: CanvasImageSource): void {
  ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  ctx.save();
  ctx.fillStyle = nail.color;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
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
  private readonly layers = new Map<Finger, Surface>();
  private readonly outputs = new Map<Finger, Surface>();
  /** The nail each canvas shows; null when it shows something that is not (yet) in the design. */
  private readonly painted = new Map<Finger, Nail | null>();
  private readonly listeners = new Set<(finger: Finger) => void>();

  constructor(private readonly createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {}

  /** The canvas that shows the nail. It stays the same object for the life of this NailPaint. */
  canvas(finger: Finger): HTMLCanvasElement {
    return this.surface(this.outputs, finger).canvas;
  }

  /** Calls the listener each time the canvas of a nail changes. Returns the function that stops it. */
  subscribe(listener: (finger: Finger) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Repaints the nails that no longer show what the design says. */
  sync(design: Design): void {
    for (const finger of FINGERS) {
      const nail = design.nails[finger];
      if (this.painted.get(finger) !== nail) this.repaint(finger, nail);
    }
  }

  /** Adds the newest piece of a stroke that is still being drawn to these nails. The design does not change. */
  extendStroke(design: Design, fingers: readonly Finger[], stroke: Stroke): void {
    const newest: Stroke = { ...stroke, points: stroke.points.slice(-4) };
    for (const finger of fingers) {
      paintStroke(this.surface(this.layers, finger).ctx, newest);
      this.compose(finger, design.nails[finger]);
      this.painted.set(finger, null);
    }
  }

  /** Shows a nail with a changed sticker, for example while it is dragged. The design does not change. */
  preview(finger: Finger, nail: Nail): void {
    this.compose(finger, nail);
    this.painted.set(finger, null);
  }

  private repaint(finger: Finger, nail: Nail): void {
    const { ctx } = this.surface(this.layers, finger);
    ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    for (const stroke of nail.strokes) paintStroke(ctx, stroke);
    this.compose(finger, nail);
    this.painted.set(finger, nail);
  }

  private compose(finger: Finger, nail: Nail): void {
    paintNail(this.surface(this.outputs, finger).ctx, nail, this.surface(this.layers, finger).canvas);
    for (const listener of this.listeners) listener(finger);
  }

  private surface(surfaces: Map<Finger, Surface>, finger: Finger): Surface {
    let surface = surfaces.get(finger);
    if (surface === undefined) {
      surface = createSurface(this.createCanvas);
      surfaces.set(finger, surface);
    }
    return surface;
  }
}
