// Types for the tests: migrate-mongo only loads the `.js` migrations.
export type MigrationIndex = {
  name: string;
  key: Record<string, number>;
  collation?: { locale?: string; strength?: number };
};

export type MigrationIndexOptions = {
  name: string;
  collation?: { locale: string; strength: number };
};

export type MigrationCollection = {
  indexes(): Promise<MigrationIndex[]>;
  createIndex(
    key: Record<string, number>,
    options: MigrationIndexOptions
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb) => Promise<void>;
export declare const down: (db: MigrationDb) => Promise<void>;
