// Types for the tests: migrate-mongo only loads the `.js` migrations.
export type MigrationCollation = { locale: string; strength: number };

export type MigrationIndex = {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
  collation?: Partial<MigrationCollation>;
};

export type MigrationIndexOptions = {
  name: string;
  unique?: boolean;
  collation?: MigrationCollation;
};

export type RepeatedName = { _id: string; n: number };

export type MigrationCollection = {
  indexes(): Promise<MigrationIndex[]>;
  createIndex(
    key: Record<string, number>,
    options: MigrationIndexOptions
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
  aggregate(
    pipeline: object[],
    options: { collation: MigrationCollation }
  ): { toArray(): Promise<RepeatedName[]> };
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb) => Promise<void>;
export declare const down: (db: MigrationDb) => Promise<void>;
