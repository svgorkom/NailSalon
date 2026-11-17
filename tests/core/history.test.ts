import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, createDesign, createHistory, execute, redo, replace, undo } from '../../src/core';

describe('history', () => {
  it('undoes and redoes a change', () => {
    const start = createHistory(createDesign('Test'));
    const changed = execute(start, { type: 'setShape', target: 'thumb', shape: 'square' });

    const undone = undo(changed);
    expect(undone.present).toEqual(start.present);
    expect(canRedo(undone)).toBe(true);

    expect(redo(undone).present).toEqual(changed.present);
  });

  it('does not record a command that changes nothing', () => {
    const start = createHistory(createDesign('Test'));
    const same = execute(start, { type: 'setShape', target: 'thumb', shape: start.present.nails.thumb.shape });

    expect(same).toBe(start);
    expect(canUndo(same)).toBe(false);
  });

  it('clears redo after a new change', () => {
    const changed = execute(createHistory(createDesign('Test')), { type: 'setFinish', target: 'fingers', finish: 'matte' });
    const branched = execute(undo(changed), { type: 'setFinish', target: 'fingers', finish: 'chrome' });

    expect(canRedo(branched)).toBe(false);
  });

  it('ignores undo and redo at the ends', () => {
    const start = createHistory(createDesign('Test'));

    expect(undo(start)).toBe(start);
    expect(redo(start)).toBe(start);
  });

  it('puts a whole new design in place as one undo step', () => {
    const start = createHistory(createDesign('Test'));
    const other = createDesign('AI-ontwerp');
    const replaced = replace(start, other);

    expect(replaced.present).toBe(other);
    expect(undo(replaced).present).toEqual(start.present);
    expect(replace(start, createDesign('Test'))).toBe(start);
  });
});
