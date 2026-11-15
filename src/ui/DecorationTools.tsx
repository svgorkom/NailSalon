import {
  type Command,
  type FrenchTip,
  type Gem,
  GEM_KINDS,
  type GemKind,
  MAX_BRUSH_SIZE,
  MAX_FRENCH_DEPTH,
  MAX_GEM_SIZE,
  MAX_STICKER_SIZE,
  MIN_BRUSH_SIZE,
  MIN_FRENCH_DEPTH,
  MIN_GEM_SIZE,
  MIN_STICKER_SIZE,
  type Sticker,
  STICKER_KINDS,
  type StickerKind,
  type StickerPlacement,
  type Target,
} from '../core';
import { GEM_LABELS, PALETTE, STICKER_LABELS } from './labels';

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

interface PlacedActionsProps {
  readonly selected: StickerPlacement | undefined;
  readonly minSize: number;
  readonly maxSize: number;
  readonly onPlace: (placement: StickerPlacement) => void;
  readonly onRemove: () => void;
}

const SIZE_STEP = 1.2;
const ROTATION_STEP = 15;

/** Resize, turn and remove the selected sticker or gem. */
function PlacedActions({ selected, minSize, maxSize, onPlace, onRemove }: PlacedActionsProps) {
  const adjust = (change: { size?: number; rotation?: number }) => {
    if (selected === undefined) return;
    const size = Math.min(maxSize, Math.max(minSize, change.size ?? selected.size));
    onPlace({ x: selected.x, y: selected.y, size, rotation: change.rotation ?? selected.rotation });
  };
  const none = selected === undefined;
  return (
    <div className="actions">
      <button type="button" disabled={none} onClick={() => adjust({ size: (selected?.size ?? 0) / SIZE_STEP })}>
        Kleiner
      </button>
      <button type="button" disabled={none} onClick={() => adjust({ size: (selected?.size ?? 0) * SIZE_STEP })}>
        Groter
      </button>
      <button type="button" disabled={none} aria-label="Draai naar links" onClick={() => adjust({ rotation: (selected?.rotation ?? 0) - ROTATION_STEP })}>
        ↺
      </button>
      <button type="button" disabled={none} aria-label="Draai naar rechts" onClick={() => adjust({ rotation: (selected?.rotation ?? 0) + ROTATION_STEP })}>
        ↻
      </button>
      <button type="button" disabled={none} onClick={onRemove}>
        Verwijder
      </button>
    </div>
  );
}

interface StickerToolsProps {
  readonly kind: StickerKind;
  readonly onKindChange: (kind: StickerKind) => void;
  /** The sticker that is selected on the nail shown on the pad. */
  readonly selected: Sticker | undefined;
  readonly canClear: boolean;
  readonly send: (command: Command) => void;
  readonly target: Target | null;
  readonly onRemoved: () => void;
}

export function StickerTools({ kind, onKindChange, selected, canClear, send, target, onRemoved }: StickerToolsProps) {
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
      <PlacedActions
        selected={selected}
        minSize={MIN_STICKER_SIZE}
        maxSize={MAX_STICKER_SIZE}
        onPlace={(placement) => selected !== undefined && target !== null && send({ type: 'updateSticker', target, id: selected.id, placement })}
        onRemove={() => {
          if (selected === undefined || target === null) return;
          send({ type: 'removeSticker', target, id: selected.id });
          onRemoved();
        }}
      />
      <button type="button" disabled={!canClear} onClick={() => target !== null && send({ type: 'clearStickers', target })}>
        Wis stickers
      </button>
    </fieldset>
  );
}

interface GemToolsProps {
  readonly kind: GemKind;
  readonly onKindChange: (kind: GemKind) => void;
  /** Whether new gems are clear glass. */
  readonly clear: boolean;
  readonly onClearChange: (clear: boolean) => void;
  /** The gem that is selected on the nail shown on the pad. */
  readonly selected: Gem | undefined;
  readonly canClear: boolean;
  readonly send: (command: Command) => void;
  readonly target: Target | null;
  readonly onRemoved: () => void;
}

export function GemTools({ kind, onKindChange, clear, onClearChange, selected, canClear, send, target, onRemoved }: GemToolsProps) {
  return (
    <fieldset>
      <legend>Steentjes</legend>
      <div className="choices">
        {GEM_KINDS.map((each) => (
          <button key={each} type="button" className="choice" aria-pressed={each === kind} onClick={() => onKindChange(each)}>
            {GEM_LABELS[each]}
          </button>
        ))}
      </div>
      <label className="toggle">
        <input type="checkbox" role="switch" className="switch" checked={clear} onChange={(event) => onClearChange(event.target.checked)} />
        Doorzichtig
      </label>
      <p className="hint">Tik op de nagel om te plakken. Tik op een steentje en kies een kleur om hem te veranderen.</p>
      <PlacedActions
        selected={selected}
        minSize={MIN_GEM_SIZE}
        maxSize={MAX_GEM_SIZE}
        onPlace={(placement) => selected !== undefined && target !== null && send({ type: 'updateGem', target, id: selected.id, placement })}
        onRemove={() => {
          if (selected === undefined || target === null) return;
          send({ type: 'removeGem', target, id: selected.id });
          onRemoved();
        }}
      />
      <button type="button" disabled={!canClear} onClick={() => target !== null && send({ type: 'clearGems', target })}>
        Wis steentjes
      </button>
    </fieldset>
  );
}

interface FrenchToolProps {
  /** The French tip shown; null when there is none. */
  readonly french: FrenchTip | null;
  /** Used when the French tip is turned on. */
  readonly fallback: FrenchTip;
  readonly onChange: (french: FrenchTip | null) => void;
}

/** French tip: on or off, its colour and how deep it reaches. */
export function FrenchTool({ french, fallback, onChange }: FrenchToolProps) {
  const shown = french ?? fallback;
  return (
    <>
      <label className="toggle">
        <input type="checkbox" role="switch" className="switch" checked={french !== null} onChange={(event) => onChange(event.target.checked ? fallback : null)} />
        Aan
      </label>
      <div className="swatches">
        {PALETTE.map(({ color, name }) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ background: color }}
            title={name}
            aria-label={`Tip ${name}`}
            aria-pressed={french?.color === color}
            onClick={() => onChange({ ...shown, color })}
          />
        ))}
        <input type="color" className="color-input" value={shown.color} aria-label="Eigen kleur voor de tip" onChange={(event) => onChange({ ...shown, color: event.target.value })} />
      </div>
      <label className="slider">
        Breedte
        <input
          type="range"
          min={MIN_FRENCH_DEPTH}
          max={MAX_FRENCH_DEPTH}
          step={0.05}
          value={shown.depth}
          onChange={(event) => onChange({ ...shown, depth: Number(event.target.value) })}
        />
      </label>
    </>
  );
}
