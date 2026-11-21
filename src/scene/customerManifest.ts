/** One customer of the salon game as listed in `public/assets/customers/manifest.json`, which `tools/customer-model/manifest.py` writes. */
export interface CustomerEntry {
  /** Unique in the manifest; a customer who is there for a pedicure as well has `<id>-foot` as the id of that model. */
  readonly id: string;
  /** What she is there for: her right hand on the table, or her right foot on a footrest. */
  readonly part: 'hand' | 'foot';
  /** Dutch first name. */
  readonly name: string;
  /** File name of the model, next to the manifest. */
  readonly file: string;
  readonly bytes: number;
  /** Base colour the app tints the `Skin` material to (`#rrggbb`). */
  readonly skin: string;
  /** One line of personality, Dutch. */
  readonly about: string;
}

/** Reads the manifest. Throws a TypeError if it is not a list of customers with these fields. */
export function parseManifest(json: unknown): readonly CustomerEntry[] {
  const list = (json as { customers?: unknown } | null)?.customers;
  if (!Array.isArray(list) || list.length === 0) throw new TypeError('Customer manifest must hold a non-empty "customers" list.');
  const seen = new Set<string>();
  return list.map((raw: unknown) => {
    const entry = raw as Partial<Record<keyof CustomerEntry, unknown>> | null;
    const text = (key: 'id' | 'name' | 'file' | 'skin' | 'about'): string => {
      const value = entry?.[key];
      if (typeof value !== 'string' || value === '') throw new TypeError(`Customer manifest entry needs a text "${key}".`);
      return value;
    };
    const id = text('id');
    if (seen.has(id)) throw new TypeError(`Customer manifest lists "${id}" twice.`);
    seen.add(id);
    const skin = text('skin');
    if (!/^#[0-9a-f]{6}$/i.test(skin)) throw new TypeError(`Customer "${id}" has an invalid skin colour.`);
    const part = entry?.part ?? 'hand';
    if (part !== 'hand' && part !== 'foot') throw new TypeError(`Customer "${id}" has an invalid "part".`);
    const bytes = entry?.bytes;
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) throw new TypeError(`Customer "${id}" needs a positive "bytes".`);
    return { id, part, name: text('name'), file: text('file'), bytes, skin, about: text('about') };
  });
}
