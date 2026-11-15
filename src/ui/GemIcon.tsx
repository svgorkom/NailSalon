import type { GemKind } from '../core';
import { GEM_OUTLINES } from '../scene/gemOutlines';
import { STICKER_PATHS } from '../scene/stickerShapes';

const VIEW = 100;

/** The outline of a gem in a 100 × 100 box; y runs down, so the outline is flipped. */
function outlinePoints(kind: GemKind): string | undefined {
  return GEM_OUTLINES[kind]?.map(([x, y]) => `${(x * 90 + 50).toFixed(1)},${(50 - y * 90).toFixed(1)}`).join(' ');
}

interface GemIconProps {
  readonly kind: GemKind;
  readonly color: string;
}

/** A small flat picture of a gem in a colour, for the buttons that choose a kind. */
export function GemIcon({ kind, color }: GemIconProps) {
  const points = outlinePoints(kind);
  return (
    <svg className="gem-icon" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true" focusable="false">
      <g fill={color} stroke="rgba(255, 255, 255, 0.75)" strokeWidth={3} strokeLinejoin="round">
        {points !== undefined ? (
          <polygon points={points} />
        ) : kind === 'heart' ? (
          <path transform="translate(50 50) scale(0.9)" d={STICKER_PATHS.heart} />
        ) : (
          <circle cx={50} cy={50} r={44} />
        )}
      </g>
      {kind === 'diamond' && <circle cx={50} cy={50} r={20} fill="none" stroke="rgba(255, 255, 255, 0.75)" strokeWidth={3} />}
      <circle cx={34} cy={32} r={6} fill="rgba(255, 255, 255, 0.85)" />
    </svg>
  );
}
