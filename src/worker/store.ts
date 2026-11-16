/** What the list of saved designs shows; `updatedAt` is in milliseconds since 1970. */
export interface DesignSummary {
  readonly id: string;
  readonly name: string;
  readonly favorite: boolean;
  readonly updatedAt: number;
}

export interface StoredDesign extends DesignSummary {
  /** The design as JSON text, checked before it was stored. */
  readonly data: string;
}

/** Designs per account. Every method only sees the designs of `owner`. */
export interface DesignStore {
  list(owner: string): Promise<readonly DesignSummary[]>;
  get(owner: string, id: string): Promise<StoredDesign | null>;
  put(owner: string, design: StoredDesign): Promise<void>;
  /** False when there was no such design. */
  setFavorite(owner: string, id: string, favorite: boolean): Promise<boolean>;
  /** False when there was no such design. */
  remove(owner: string, id: string): Promise<boolean>;
}

/** The part of the D1 binding this store uses (see Cloudflare's `D1Database`). */
export interface D1Like {
  prepare(query: string): D1StatementLike;
}

interface D1StatementLike {
  bind(...values: readonly (string | number)[]): D1StatementLike;
  all<T>(): Promise<{ readonly results: readonly T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ readonly meta: { readonly changes: number } }>;
}

interface Row {
  readonly id: string;
  readonly name: string;
  readonly favorite: number;
  readonly updated_at: number;
  readonly data?: string;
}

/** The table is created on first use, so a fresh database needs no migration step in the deploy. */
const SCHEMA = `CREATE TABLE IF NOT EXISTS designs (
  owner TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (owner, id)
)`;

export function d1Store(db: D1Like): DesignStore {
  let ready: Promise<unknown> | null = null;
  const table = () => (ready ??= db.prepare(SCHEMA).run().catch((error: unknown) => {
    ready = null;
    throw error;
  }));
  const summary = (row: Row): DesignSummary => ({ id: row.id, name: row.name, favorite: row.favorite === 1, updatedAt: row.updated_at });

  return {
    async list(owner) {
      await table();
      const { results } = await db
        .prepare('SELECT id, name, favorite, updated_at FROM designs WHERE owner = ? ORDER BY favorite DESC, updated_at DESC')
        .bind(owner)
        .all<Row>();
      return results.map(summary);
    },
    async get(owner, id) {
      await table();
      const row = await db.prepare('SELECT id, name, favorite, updated_at, data FROM designs WHERE owner = ? AND id = ?').bind(owner, id).first<Row>();
      return row === null ? null : { ...summary(row), data: row.data ?? '' };
    },
    async put(owner, design) {
      await table();
      await db
        .prepare(
          `INSERT INTO designs (owner, id, name, favorite, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (owner, id) DO UPDATE SET name = excluded.name, favorite = excluded.favorite, updated_at = excluded.updated_at, data = excluded.data`,
        )
        .bind(owner, design.id, design.name, design.favorite ? 1 : 0, design.updatedAt, design.data)
        .run();
    },
    async setFavorite(owner, id, favorite) {
      await table();
      const { meta } = await db.prepare('UPDATE designs SET favorite = ? WHERE owner = ? AND id = ?').bind(favorite ? 1 : 0, owner, id).run();
      return meta.changes > 0;
    },
    async remove(owner, id) {
      await table();
      const { meta } = await db.prepare('DELETE FROM designs WHERE owner = ? AND id = ?').bind(owner, id).run();
      return meta.changes > 0;
    },
  };
}
