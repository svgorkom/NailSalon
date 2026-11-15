import {
  assertPlacement,
  assertSticker,
  assertStroke,
  normaliseRotation,
  type Sticker,
  type StickerPlacement,
  type Stroke,
} from './decoration';
import { type Design, type Finger, type Finish, FINGERS, type HexColor, isHexColor, MAX_LENGTH, MIN_LENGTH, type Nail, type NailShape } from './design';

/** Which nails a command applies to: one finger, or all of them. */
export type Target = Finger | 'all';

export type Command =
  | { readonly type: 'setShape'; readonly target: Target; readonly shape: NailShape }
  | { readonly type: 'setLength'; readonly target: Target; readonly length: number }
  | { readonly type: 'setColor'; readonly target: Target; readonly color: HexColor }
  | { readonly type: 'setFinish'; readonly target: Target; readonly finish: Finish }
  | { readonly type: 'addStroke'; readonly target: Target; readonly stroke: Stroke }
  | { readonly type: 'clearDrawing'; readonly target: Target }
  | { readonly type: 'addSticker'; readonly target: Target; readonly sticker: Sticker }
  /** Only the nails that have a sticker with this id change; it is an error if there is none. */
  | { readonly type: 'updateSticker'; readonly target: Target; readonly id: string; readonly placement: StickerPlacement }
  | { readonly type: 'removeSticker'; readonly target: Target; readonly id: string }
  | { readonly type: 'clearStickers'; readonly target: Target }
  | { readonly type: 'rename'; readonly name: string };

/** Applies a command and returns a new design; the input is never changed. Throws on invalid input. */
export function apply(design: Design, command: Command): Design {
  switch (command.type) {
    case 'rename': {
      const name = command.name.trim();
      if (name.length === 0) throw new RangeError('Name must not be empty.');
      return { ...design, name };
    }
    case 'setShape':
      return updateNails(design, command.target, (nail) => ({ ...nail, shape: command.shape }));
    case 'setLength': {
      const { length } = command;
      if (!Number.isFinite(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
        throw new RangeError(`Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}.`);
      }
      return updateNails(design, command.target, (nail) => ({ ...nail, length }));
    }
    case 'setColor': {
      if (!isHexColor(command.color)) throw new RangeError('Colour must be #rrggbb.');
      const color = command.color.toLowerCase();
      return updateNails(design, command.target, (nail) => ({ ...nail, color }));
    }
    case 'setFinish':
      return updateNails(design, command.target, (nail) => ({ ...nail, finish: command.finish }));
    case 'addStroke': {
      assertStroke(command.stroke);
      const stroke = { ...command.stroke, color: command.stroke.color.toLowerCase() };
      return updateNails(design, command.target, (nail) => ({ ...nail, strokes: [...nail.strokes, stroke] }));
    }
    case 'clearDrawing':
      return updateNails(design, command.target, (nail) => (nail.strokes.length === 0 ? nail : { ...nail, strokes: [] }));
    case 'addSticker': {
      assertSticker(command.sticker);
      const sticker = { ...command.sticker, color: command.sticker.color.toLowerCase(), rotation: normaliseRotation(command.sticker.rotation) };
      return updateNails(design, command.target, (nail) => {
        if (nail.stickers.some(({ id }) => id === sticker.id)) throw new RangeError(`Sticker ${sticker.id} already exists on this nail.`);
        return { ...nail, stickers: [...nail.stickers, sticker] };
      });
    }
    case 'updateSticker': {
      assertPlacement(command.placement);
      const placement = { ...command.placement, rotation: normaliseRotation(command.placement.rotation) };
      return updateStickers(design, command.target, command.id, (stickers) =>
        stickers.map((sticker) => (sticker.id === command.id ? { ...sticker, ...placement } : sticker)),
      );
    }
    case 'removeSticker':
      return updateStickers(design, command.target, command.id, (stickers) => stickers.filter(({ id }) => id !== command.id));
    case 'clearStickers':
      return updateNails(design, command.target, (nail) => (nail.stickers.length === 0 ? nail : { ...nail, stickers: [] }));
  }
}

function targetFingers(target: Target): readonly Finger[] {
  return target === 'all' ? FINGERS : [target];
}

function updateNails(design: Design, target: Target, update: (nail: Nail) => Nail): Design {
  const nails = { ...design.nails };
  for (const finger of targetFingers(target)) nails[finger] = update(nails[finger]);
  return { ...design, nails };
}

function updateStickers(design: Design, target: Target, id: string, update: (stickers: readonly Sticker[]) => readonly Sticker[]): Design {
  const fingers = targetFingers(target).filter((finger) => design.nails[finger].stickers.some((sticker) => sticker.id === id));
  if (fingers.length === 0) throw new RangeError(`Sticker ${id} does not exist.`);
  const nails = { ...design.nails };
  for (const finger of fingers) nails[finger] = { ...nails[finger], stickers: update(nails[finger].stickers) };
  return { ...design, nails };
}
