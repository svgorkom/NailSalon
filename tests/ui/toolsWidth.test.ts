import { describe, expect, it } from 'vitest';
import { clampToolsWidth, MIN_TOOLS_WIDTH } from '../../src/ui/toolsWidth';

describe('clampToolsWidth', () => {
  it('keeps a width that fits', () => {
    expect(clampToolsWidth(400, 1200)).toBe(400);
  });

  it('never goes below the minimum', () => {
    expect(clampToolsWidth(50, 1200)).toBe(MIN_TOOLS_WIDTH);
  });

  it('never takes more than 60% of the editor', () => {
    expect(clampToolsWidth(2000, 1000)).toBe(600);
  });

  it('keeps the minimum in a very narrow editor', () => {
    expect(clampToolsWidth(300, 300)).toBe(MIN_TOOLS_WIDTH);
  });
});
