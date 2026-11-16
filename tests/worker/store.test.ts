import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { type D1Like, d1Store } from '../../src/worker/store';

/** D1 is SQLite; this runs the store's SQL on Node's built-in SQLite. */
function sqliteD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  const statement = (query: string, values: readonly (string | number)[]) => ({
    bind: (...next: readonly (string | number)[]) => statement(query, next),
    all: async <T,>() => ({ results: db.prepare(query).all(...values) as T[] }),
    first: async <T,>() => (db.prepare(query).get(...values) as T | undefined) ?? null,
    run: async () => ({ meta: { changes: Number(db.prepare(query).run(...values).changes) } }),
  });
  return { prepare: (query) => statement(query, []) };
}

const design = (id: string, updatedAt: number, favorite = false) => ({ id, name: `Ontwerp ${id}`, favorite, updatedAt, data: '{}' });

describe('d1Store', () => {
  it('stores, updates, sorts and deletes designs per owner', async () => {
    const store = d1Store(sqliteD1());
    await store.put('a', design('1', 10));
    await store.put('a', design('2', 20));
    await store.put('a', design('3', 5, true));
    await store.put('b', design('4', 30));
    await store.put('a', { ...design('1', 40), name: 'Nieuw' });

    expect((await store.list('a')).map(({ id }) => id)).toEqual(['3', '1', '2']);
    expect(await store.get('a', '1')).toEqual({ id: '1', name: 'Nieuw', favorite: false, updatedAt: 40, data: '{}' });
    expect(await store.get('b', '1')).toBeNull();

    expect(await store.setFavorite('a', '2', true)).toBe(true);
    expect(await store.setFavorite('b', '2', true)).toBe(false);
    expect(await store.remove('b', '1')).toBe(false);
    expect(await store.remove('a', '1')).toBe(true);
    expect((await store.list('a')).map(({ id }) => id)).toEqual(['2', '3']);
  });
});
