import { useId } from 'react';

/** The drawing tools that have a picture: on their buttons and as the pointer on the pad. */
export type DrawingTool = 'brush' | 'eraser' | 'sponge';

interface ToolIconProps {
  readonly tool: DrawingTool;
  /** The paint on the brush and the sponge. */
  readonly color: string;
  readonly className?: string;
}

const OUTLINE = '#3b2a1f';

/**
 * A brush, eraser or sponge in a 48 × 48 box. The working end (the brush tip, the eraser's edge, the sponge's
 * corner) is at (4, 44), so the pad can put that point exactly under the pointer.
 */
export function ToolIcon({ tool, color, className }: ToolIconProps) {
  const clip = useId();
  return (
    <svg className={className} viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
      {tool === 'brush' ? (
        <g transform="translate(4 44) rotate(-45)" stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round">
          <path d="M50 -2.6 Q54 0 50 2.6 L21 4.2 L21 -4.2 Z" fill="#e8618c" />
          <path d="M23 -2.8 L49 -1.6" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" fill="none" />
          <rect x="13" y="-4.6" width="8.5" height="9.2" rx="1" fill="#cfd5dc" />
          <path d="M15.5 -4.6 V4.6 M18.5 -4.6 V4.6" stroke="#9aa3ad" strokeWidth="0.9" />
          <path d="M0 0 Q3 -4.5 13 -4.6 L13 4.6 Q3 4.5 0 0 Z" fill={color} />
        </g>
      ) : tool === 'eraser' ? (
        <g transform="translate(4 44) rotate(-45)" stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round">
          <rect x="0" y="-7.5" width="34" height="15" rx="2.5" fill="#ff8fab" />
          <path d="M2.5 -7.5 H13 V7.5 H2.5 A2.5 2.5 0 0 1 0 5 V-5 A2.5 2.5 0 0 1 2.5 -7.5 Z" fill="#f4f1ec" />
          <path d="M15 -5 H31" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.4" fill="none" />
        </g>
      ) : (
        <g transform="translate(4 44) rotate(-30)" stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round">
          <clipPath id={clip}>
            <rect x="0" y="-22" width="32" height="22" rx="6" />
          </clipPath>
          <g clipPath={`url(#${clip})`} stroke="none">
            <rect x="0" y="-22" width="32" height="22" fill="#ffd56b" />
            <rect x="0" y="-6" width="32" height="6" fill={color} />
          </g>
          <rect x="0" y="-22" width="32" height="22" rx="6" fill="none" />
          <g fill="#e0a92c" stroke="none">
            <circle cx="7" cy="-16" r="2.2" />
            <circle cx="15" cy="-11" r="1.6" />
            <circle cx="22" cy="-17" r="2" />
            <circle cx="27" cy="-10.5" r="1.4" />
            <circle cx="12" cy="-18.5" r="1.1" />
          </g>
        </g>
      )}
    </svg>
  );
}
