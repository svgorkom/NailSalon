import { readSetting, writeSetting } from './storage';

export const DEFAULT_TOOLS_WIDTH = 288;
export const MIN_TOOLS_WIDTH = 240;
/** The tools panel never takes more than this share of the editor, so the hand stays visible. */
const MAX_SHARE = 0.6;

const STORAGE_KEY = 'nailsalon.toolsWidth';

/** Keeps a width in pixels between the minimum and the largest share of the editor. */
export function clampToolsWidth(width: number, editorWidth: number): number {
  const max = Math.max(MIN_TOOLS_WIDTH, editorWidth * MAX_SHARE);
  return Math.round(Math.min(max, Math.max(MIN_TOOLS_WIDTH, width)));
}

export function loadToolsWidth(): number {
  const stored = Number(readSetting(STORAGE_KEY));
  return Number.isFinite(stored) && stored >= MIN_TOOLS_WIDTH ? stored : DEFAULT_TOOLS_WIDTH;
}

export function saveToolsWidth(width: number): void {
  writeSetting(STORAGE_KEY, String(width));
}
