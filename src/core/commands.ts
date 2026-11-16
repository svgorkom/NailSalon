import {
  assertFrenchTip,
  assertGem,
  assertGemKind,
  assertGemLook,
  assertGemPlacement,
  assertPlacement,
  type FrenchTip,
  type Gem,
  type GemKind,
  type GemLook,
  assertSticker,
  assertStroke,
  normaliseRotation,
  type Sticker,
  type StickerPlacement,
  type Stroke,
} from './decoration';
import { type Design, type Finger, type Finish, FINGERS, type HexColor, isHexColor, MAX_LENGTH, MAX_NAME_LENGTH, MIN_LENGTH, type Nail, type NailShape } from './design';

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
  /** null removes the French tip. */
  | { readonly type: 'setFrench'; readonly target: Target; readonly french: FrenchTip | null }
  | { readonly type: 'addGem'; readonly target: Target; readonly gem: Gem }
  /** Only the nails that have a gem with this id change; it is an error if there is none. */
  | { readonly type: 'updateGem'; readonly target: Target; readonly id: string; readonly placement: StickerPlacement }
  /** Changes colour and clearness of a gem; only the nails that have it change. */
  | { readonly type: 'styleGem'; readonly target: Target; readonly id: string; readonly look: GemLook }
  /** Changes the kind of a gem; only the nails that have it change. */
  | { readonly type: 'setGemKind'; readonly target: Target; readonly id: string; readonly kind: GemKind }
  | { readonly type: 'removeGem'; readonly target: Target; readonly id: string }
  | { readonly type: 'clearGems'; readonly target: Target }
  | { readonly type: 'rename'; readonly name: string };

/** Applies a command and returns a new design; the input is never changed. Throws on invalid input. */
export function apply(design: Design, command: Command): Design {
  switch (command.type) {
    case 'rename': {
      const name = command.name.trim();
      if (name.length === 0 || name.length > MAX_NAME_LENGTH) throw new RangeError(`Name must be 1 to ${MAX_NAME_LENGTH} characters.`);
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
      return updateItems(design, command.target, 'stickers', command.id, (stickers) =>
        stickers.map((sticker) => (sticker.id === command.id ? { ...sticker, ...placement } : sticker)),
      );
    }
    case 'removeSticker':
      return updateItems(design, command.target, 'stickers', command.id, (stickers) => stickers.filter(({ id }) => id !== command.id));
    case 'clearStickers':
      return updateNails(design, command.target, (nail) => (nail.stickers.length === 0 ? nail : { ...nail, stickers: [] }));
    case 'setFrench': {
      if (command.french === null) return updateNails(design, command.target, (nail) => ({ ...nail, french: null }));
      assertFrenchTip(command.french);
      const french = { ...command.french, color: command.french.color.toLowerCase() };
      return updateNails(design, command.target, (nail) => ({ ...nail, french }));
    }
    case 'addGem': {
      assertGem(command.gem);
      const gem = { ...command.gem, color: command.gem.color.toLowerCase(), rotation: normaliseRotation(command.gem.rotation) };
      return updateNails(design, command.target, (nail) => {
        if (nail.gems.some(({ id }) => id === gem.id)) throw new RangeError(`Gem ${gem.id} already exists on this nail.`);
        return { ...nail, gems: [...nail.gems, gem] };
      });
    }
    case 'updateGem': {
      assertGemPlacement(command.placement);
      const placement = { ...command.placement, rotation: normaliseRotation(command.placement.rotation) };
      return updateItems(design, command.target, 'gems', command.id, (gems) => gems.map((gem) => (gem.id === command.id ? { ...gem, ...placement } : gem)));
    }
    case 'styleGem': {
      assertGemLook(command.look);
      const look = { color: command.look.color.toLowerCase(), clear: command.look.clear };
      return updateItems(design, command.target, 'gems', command.id, (gems) => gems.map((gem) => (gem.id === command.id ? { ...gem, ...look } : gem)));
    }
    case 'setGemKind':
      assertGemKind(command.kind);
      return updateItems(design, command.target, 'gems', command.id, (gems) => gems.map((gem) => (gem.id === command.id ? { ...gem, kind: command.kind } : gem)));
    case 'removeGem':
      return updateItems(design, command.target, 'gems', command.id, (gems) => gems.filter(({ id }) => id !== command.id));
    case 'clearGems':
      return updateNails(design, command.target, (nail) => (nail.gems.length === 0 ? nail : { ...nail, gems: [] }));
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

type Layer = 'stickers' | 'gems';
type LayerItem<L extends Layer> = L extends 'stickers' ? Sticker : Gem;

/** Changes the stickers or gems of the targeted nails that have an item with this id. Throws if none has. */
function updateItems<L extends Layer>(design: Design, target: Target, layer: L, id: string, update: (items: readonly LayerItem<L>[]) => readonly LayerItem<L>[]): Design {
  const items = (finger: Finger) => design.nails[finger][layer] as readonly LayerItem<L>[];
  const fingers = targetFingers(target).filter((finger) => items(finger).some((item) => item.id === id));
  if (fingers.length === 0) throw new RangeError(`${layer === 'gems' ? 'Gem' : 'Sticker'} ${id} does not exist.`);
  const nails = { ...design.nails };
  for (const finger of fingers) nails[finger] = { ...nails[finger], [layer]: update(items(finger)) };
  return { ...design, nails };
}
