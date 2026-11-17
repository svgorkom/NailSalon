import { describe, expect, it } from 'vitest';
import { aiAnswerSchema, STICKER_KINDS } from '../../src/core';
import { STICKER_PATHS } from '../../src/scene/stickerShapes';
import { STICKER_CATEGORIES, STICKER_LABELS } from '../../src/ui/labels';
import { FIRST_STICKERS, withRecentSticker } from '../../src/ui/recentStickers';

describe('sticker library', () => {
  it('has a shape for every sticker kind and no others', () => {
    expect(Object.keys(STICKER_PATHS).sort()).toEqual([...STICKER_KINDS].sort());
    expect(Object.values(STICKER_PATHS).every((path) => path.startsWith('M'))).toBe(true);
  });

  it('puts every sticker in exactly one group of the menu', () => {
    const grouped = STICKER_CATEGORIES.flatMap(({ kinds }) => kinds);
    expect(grouped).toHaveLength(STICKER_KINDS.length);
    expect(new Set(grouped)).toEqual(new Set(STICKER_KINDS));
  });

  it('gives every sticker its own Dutch name', () => {
    const names = STICKER_KINDS.map((kind) => STICKER_LABELS[kind]);
    expect(names.every((name) => name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('offers the AI every sticker, including the skull', () => {
    const schema = JSON.stringify(aiAnswerSchema('hand'));
    expect(schema).toContain('"skull"');
    expect(STICKER_KINDS.every((kind) => schema.includes(`"${kind}"`))).toBe(true);
  });
});

describe('withRecentSticker', () => {
  it('puts a new sticker first and drops the oldest', () => {
    expect(withRecentSticker(FIRST_STICKERS, 'skull')).toEqual(['skull', 'heart', 'star', 'flower', 'sparkle', 'moon']);
  });

  it('leaves the row as it is when the sticker is already in it', () => {
    expect(withRecentSticker(FIRST_STICKERS, 'moon')).toBe(FIRST_STICKERS);
  });
});
