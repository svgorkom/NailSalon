/** The part of Node's built-in SQLite the store test uses; the project has no Node types. */
declare module 'node:sqlite' {
  interface StatementSync {
    all(...values: readonly (string | number)[]): unknown[];
    get(...values: readonly (string | number)[]): unknown;
    run(...values: readonly (string | number)[]): { changes: number | bigint };
  }
  export class DatabaseSync {
    constructor(path: string);
    prepare(query: string): StatementSync;
  }
}
