import type { StickerKind } from '../core';

/** How many stickers the quick row shows. */
const RECENT_STICKERS = 6;

/** The quick row before any sticker is chosen: the first six of the app. */
export const FIRST_STICKERS: readonly StickerKind[] = ['heart', 'star', 'flower', 'sparkle', 'moon', 'butterfly'];

/**
 * The quick row after choosing `kind`: a sticker already in the row keeps its place, so the buttons do not jump
 * under her finger; a new one comes first and the oldest drops off.
 */
export function withRecentSticker(recent: readonly StickerKind[], kind: StickerKind): readonly StickerKind[] {
  if (recent.includes(kind)) return recent;
  return [kind, ...recent].slice(0, RECENT_STICKERS);
}
