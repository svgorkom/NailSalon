import { useRef, useState } from 'react';
import type { StickerKind } from '../core';
import { STICKER_PATHS } from '../scene/stickerShapes';
import { STICKER_CATEGORIES, STICKER_LABELS } from './labels';

interface StickerIconProps {
  readonly kind: StickerKind;
  readonly color: string;
}

/** A sticker as it will look on the nail, in its colour. */
export function StickerIcon({ kind, color }: StickerIconProps) {
  return (
    <svg className="sticker-icon" viewBox="-54 -54 108 108" aria-hidden="true" focusable="false">
      <path d={STICKER_PATHS[kind]} fill={color} />
    </svg>
  );
}

interface StickerMenuProps {
  readonly kind: StickerKind;
  readonly color: string;
  /** Stickers chosen last, newest first, as quick buttons. */
  readonly recent: readonly StickerKind[];
  readonly onKindChange: (kind: StickerKind) => void;
}

/** The chosen sticker, a few quick choices and a button that opens all stickers, grouped, in a window. */
export function StickerMenu({ kind, color, recent, onKindChange }: StickerMenuProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState(0);
  const shown = STICKER_CATEGORIES[category]?.kinds ?? [];

  const open = () => {
    const index = STICKER_CATEGORIES.findIndex(({ kinds }) => kinds.includes(kind));
    setCategory(Math.max(0, index));
    dialog.current?.showModal();
  };
  const choose = (each: StickerKind) => {
    onKindChange(each);
    dialog.current?.close();
  };

  return (
    <>
      <div className="sticker-quick">
        {recent.map((each) => (
          <button key={each} type="button" className="choice sticker-choice" aria-pressed={each === kind} onClick={() => onKindChange(each)}>
            <StickerIcon kind={each} color={color} />
            {STICKER_LABELS[each]}
          </button>
        ))}
      </div>
      <button type="button" className="sticker-open" onClick={open}>
        🗂️ Alle stickers
      </button>
      <dialog ref={dialog} className="designs-dialog sticker-dialog panel" aria-labelledby="sticker-title">
        <div className="row">
          <h2 id="sticker-title" className="grow">
            ⭐ Kies een sticker
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Sluiten">
            ✕
          </button>
        </div>
        <div className="sticker-categories" role="group" aria-label="Soort stickers">
          {STICKER_CATEGORIES.map((each, index) => (
            <button key={each.name} type="button" className="choice" aria-pressed={index === category} onClick={() => setCategory(index)}>
              <span aria-hidden="true">{each.icon}</span> {each.name}
            </button>
          ))}
        </div>
        <div className="sticker-grid">
          {shown.map((each) => (
            <button key={each} type="button" className="choice sticker-choice" aria-pressed={each === kind} onClick={() => choose(each)}>
              <StickerIcon kind={each} color={color} />
              {STICKER_LABELS[each]}
            </button>
          ))}
        </div>
      </dialog>
    </>
  );
}
