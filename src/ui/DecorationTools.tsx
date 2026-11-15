import { type Command, MAX_BRUSH_SIZE, MAX_STICKER_SIZE, MIN_BRUSH_SIZE, MIN_STICKER_SIZE, type Nail, STICKER_KINDS, type StickerKind, type Target } from '../core';
import { PALETTE, STICKER_LABELS } from './labels';

interface ColorToolProps {
  readonly color: string;
  readonly onChange: (color: string) => void;
}

/** The colour for the brush and for new stickers. */
export function ColorTool({ color, onChange }: ColorToolProps) {
  return (
    <fieldset>
      <legend>Kleur</legend>
      <div className="swatches">
        {PALETTE.map(({ color: swatch, name }) => (
          <button key={swatch} type="button" className="swatch" style={{ background: swatch }} title={name} aria-label={name} aria-pressed={swatch === color} onClick={() => onChange(swatch)} />
        ))}
        <input type="color" className="color-input" value={color} aria-label="Eigen kleur" onChange={(event) => onChange(event.target.value)} />
      </div>
    </fieldset>
  );
}

interface DrawToolsProps {
  readonly eraser: boolean;
  readonly onEraserChange: (eraser: boolean) => void;
  readonly size: number;
  readonly onSizeChange: (size: number) => void;
  readonly canClear: boolean;
  readonly onClear: () => void;
}

export function DrawTools({ eraser, onEraserChange, size, onSizeChange, canClear, onClear }: DrawToolsProps) {
  return (
    <fieldset>
      <legend>Tekenen</legend>
      <div className="choices">
        <button type="button" className="choice" aria-pressed={!eraser} onClick={() => onEraserChange(false)}>
          ✏️ Penseel
        </button>
        <button type="button" className="choice" aria-pressed={eraser} onClick={() => onEraserChange(true)}>
          🧽 Gum
        </button>
      </div>
      <label className="slider">
        Dikte
        <input
          type="range"
          min={Math.round(MIN_BRUSH_SIZE * 100)}
          max={Math.round(MAX_BRUSH_SIZE * 100)}
          step={1}
          value={Math.round(size * 100)}
          onChange={(event) => onSizeChange(Number(event.target.value) / 100)}
        />
      </label>
      <button type="button" disabled={!canClear} onClick={onClear}>
        Wis tekening
      </button>
    </fieldset>
  );
}

interface StickerToolsProps {
  readonly kind: StickerKind;
  readonly onKindChange: (kind: StickerKind) => void;
  /** The sticker that is selected on the nail shown on the pad. */
  readonly selected: Nail['stickers'][number] | undefined;
  readonly canClear: boolean;
  readonly send: (command: Command) => void;
  readonly target: Target | null;
  readonly onRemoved: () => void;
}

const SIZE_STEP = 1.2;
const ROTATION_STEP = 15;

export function StickerTools({ kind, onKindChange, selected, canClear, send, target, onRemoved }: StickerToolsProps) {
  const adjust = (change: { size?: number; rotation?: number }) => {
    if (selected === undefined || target === null) return;
    const size = Math.min(MAX_STICKER_SIZE, Math.max(MIN_STICKER_SIZE, change.size ?? selected.size));
    send({ type: 'updateSticker', target, id: selected.id, placement: { x: selected.x, y: selected.y, size, rotation: change.rotation ?? selected.rotation } });
  };

  return (
    <fieldset>
      <legend>Stickers</legend>
      <div className="choices">
        {STICKER_KINDS.map((each) => (
          <button key={each} type="button" className="choice" aria-pressed={each === kind} onClick={() => onKindChange(each)}>
            {STICKER_LABELS[each]}
          </button>
        ))}
      </div>
      <p className="hint">Tik op de nagel om te plakken. Sleep een sticker om hem te verschuiven.</p>
      <div className="choices">
        <button type="button" disabled={selected === undefined} onClick={() => adjust({ size: (selected?.size ?? 0) / SIZE_STEP })}>
          Kleiner
        </button>
        <button type="button" disabled={selected === undefined} onClick={() => adjust({ size: (selected?.size ?? 0) * SIZE_STEP })}>
          Groter
        </button>
        <button type="button" disabled={selected === undefined} aria-label="Draai naar links" onClick={() => adjust({ rotation: (selected?.rotation ?? 0) - ROTATION_STEP })}>
          ↺
        </button>
        <button type="button" disabled={selected === undefined} aria-label="Draai naar rechts" onClick={() => adjust({ rotation: (selected?.rotation ?? 0) + ROTATION_STEP })}>
          ↻
        </button>
        <button
          type="button"
          disabled={selected === undefined}
          onClick={() => {
            if (selected === undefined || target === null) return;
            send({ type: 'removeSticker', target, id: selected.id });
            onRemoved();
          }}
        >
          Verwijder
        </button>
      </div>
      <button type="button" disabled={!canClear} onClick={() => target !== null && send({ type: 'clearStickers', target })}>
        Wis stickers
      </button>
    </fieldset>
  );
}
