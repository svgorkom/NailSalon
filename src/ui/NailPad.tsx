import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react';
import { type Command, type Design, type Digit, type GemKind, type Nail, nailAt, type Sponge, type StickerKind, type StickerPlacement, type Stroke, type Target, targetDigits } from '../core';
import { type NailPaint, paintGem, TEXTURE_HEIGHT, TEXTURE_WIDTH, traceNailOutline } from '../scene/nailPaint';
import { clamp01, movedEnough, type NailPoint, spongeStep, stickerAt, toNailPoint } from './pad';

export type PadTool = 'brush' | 'eraser' | 'sponge' | 'sticker' | 'gem';

/** Size of a new sticker and of a new gem, as a fraction of the nail width. */
const NEW_STICKER_SIZE = 0.35;
const NEW_GEM_SIZE = 0.2;

/** Stickers are painted on the nail; gems stand on it in 3D. */
type Layer = 'stickers' | 'gems';

type Gesture =
  | { readonly kind: 'stroke'; readonly points: number[]; readonly sponge: Sponge | undefined }
  | { readonly kind: 'drag'; readonly layer: Layer; readonly id: string; readonly offset: NailPoint; placement: StickerPlacement; moved: boolean };

/** A nail with one sticker or gem moved to `placement`. */
function withPlacement(nail: Nail, layer: Layer, id: string, placement: StickerPlacement): Nail {
  return layer === 'stickers'
    ? { ...nail, stickers: nail.stickers.map((item) => (item.id === id ? { ...item, ...placement } : item)) }
    : { ...nail, gems: nail.gems.map((item) => (item.id === id ? { ...item, ...placement } : item)) };
}

interface NailPadProps {
  /** The nail shown on the pad; null until a nail is chosen. */
  readonly digit: Digit | null;
  /** What changes apply to: the nail shown, or all nails. */
  readonly target: Target | null;
  readonly design: Design;
  readonly paint: NailPaint;
  readonly tool: PadTool;
  readonly color: string;
  /** Brush and eraser size, as a fraction of the nail width. */
  readonly brushSize: number;
  /** Size of a sponge dab, as a fraction of the nail width, and the colour one dab leaves. */
  readonly spongeSize: number;
  readonly spongeOpacity: number;
  readonly stickerKind: StickerKind;
  readonly gemKind: GemKind;
  /** Whether new gems are clear glass. */
  readonly gemClear: boolean;
  /** The selected sticker or gem, depending on the tool. */
  readonly selectedItem: string | null;
  readonly onCommand: (command: Command) => void;
  readonly onSelectItem: (id: string | null) => void;
  readonly newItemId: () => string;
  /** A new seed (an unsigned 32-bit integer) for the pattern of a sponge stroke. */
  readonly newSeed: () => number;
}

/** A large flat view of one nail to draw on and to place stickers and gems on. Shows the same canvas as the 3D nail, with the gems drawn over it. */
export function NailPad({ digit, target, design, paint, tool, color, brushSize, spongeSize, spongeOpacity, stickerKind, gemKind, gemClear, selectedItem, onCommand, onSelectItem, newItemId, newSeed }: NailPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const targets: readonly Digit[] = target === null ? [] : targetDigits(target);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || digit === null) return;
    ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    ctx.drawImage(paint.canvas(digit), 0, 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    traceNailOutline(ctx);
    ctx.stroke();
    const current = gesture.current;
    const dragged = current?.kind === 'drag' ? current : null;
    const nail = dragged === null ? nailAt(design, digit) : withPlacement(nailAt(design, digit), dragged.layer, dragged.id, dragged.placement);
    for (const gem of nail.gems) paintGem(ctx, gem);
    const items = tool === 'sticker' ? nail.stickers : tool === 'gem' ? nail.gems : [];
    const item = items.find(({ id }) => id === selectedItem);
    if (item !== undefined) {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(item.x * TEXTURE_WIDTH, item.y * TEXTURE_HEIGHT, (item.size * TEXTURE_WIDTH) / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [digit, design, paint, tool, selectedItem]);

  useEffect(() => {
    draw();
    return paint.subscribe((changed) => {
      if (changed === digit) draw();
    });
  }, [draw, paint, digit]);

  const pointAt = (event: { clientX: number; clientY: number }): NailPoint => toNailPoint(event.clientX, event.clientY, canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 });

  const strokeOf = (points: number[], sponge: Sponge | undefined): Stroke =>
    sponge === undefined ? { color, size: brushSize, erase: tool === 'eraser', points } : { color, size: spongeSize, erase: false, points, sponge };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (digit === null || target === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointAt(event);
    if (tool === 'sticker' || tool === 'gem') {
      const layer: Layer = tool === 'sticker' ? 'stickers' : 'gems';
      const hit = stickerAt<StickerPlacement & { id: string }>(nailAt(design, digit)[layer], point);
      if (hit === undefined) {
        const id = newItemId();
        const placement = { x: point.x, y: point.y, rotation: 0 };
        onCommand(
          tool === 'sticker'
            ? { type: 'addSticker', target, sticker: { id, kind: stickerKind, color, size: NEW_STICKER_SIZE, ...placement } }
            : { type: 'addGem', target, gem: { id, kind: gemKind, color, clear: gemClear, size: NEW_GEM_SIZE, ...placement } },
        );
        onSelectItem(id);
      } else {
        onSelectItem(hit.id);
        const { x, y, size, rotation } = hit;
        gesture.current = { kind: 'drag', layer, id: hit.id, offset: { x: x - point.x, y: y - point.y }, placement: { x, y, size, rotation }, moved: false };
      }
      return;
    }
    const sponge = tool === 'sponge' ? { seed: newSeed(), opacity: spongeOpacity } : undefined;
    gesture.current = { kind: 'stroke', points: [point.x, point.y], sponge };
    paint.extendStroke(design, targets, strokeOf(gesture.current.points, sponge));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = gesture.current;
    if (current === null || digit === null) return;
    // Fast pointers report several positions per event; using them all keeps curves smooth.
    const reports = event.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const report of reports.length > 0 ? reports : [event.nativeEvent]) {
      const point = pointAt(report);
      if (current.kind === 'stroke') {
        const last = { x: current.points.at(-2) ?? 0, y: current.points.at(-1) ?? 0 };
        if (!movedEnough(last, point, current.sponge === undefined ? undefined : spongeStep(spongeSize))) continue;
        current.points.push(point.x, point.y);
        paint.extendStroke(design, targets, strokeOf(current.points, current.sponge));
      } else {
        current.placement = { ...current.placement, x: clamp01(point.x + current.offset.x), y: clamp01(point.y + current.offset.y) };
        current.moved = true;
        // A sticker is part of the texture, so the 3D nail follows it; a gem moves on the pad and lands on the nail when let go.
        if (current.layer === 'stickers') {
          for (const each of targets) {
            const nail = nailAt(design, each);
            if (nail.stickers.some(({ id }) => id === current.id)) paint.preview(each, withPlacement(nail, 'stickers', current.id, current.placement));
          }
        }
        draw();
      }
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = gesture.current;
    gesture.current = null;
    if (current === null || target === null) return;
    // A cancelled gesture (for example a palm touch) changes nothing.
    const done = event.type === 'pointerup';
    if (done && current.kind === 'stroke') onCommand({ type: 'addStroke', target, stroke: strokeOf(current.points, current.sponge) });
    if (done && current.kind === 'drag' && current.moved) {
      onCommand({ type: current.layer === 'stickers' ? 'updateSticker' : 'updateGem', target, id: current.id, placement: current.placement });
    }
    paint.sync(design);
    draw();
  };

  return (
    <div className="pad">
      <canvas
        ref={canvasRef}
        className="pad-canvas"
        width={TEXTURE_WIDTH}
        height={TEXTURE_HEIGHT}
        aria-label="Tekenpad"
        data-tool={tool}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
      {digit === null && <p className="pad-hint">Kies eerst een nagel.</p>}
    </div>
  );
}
