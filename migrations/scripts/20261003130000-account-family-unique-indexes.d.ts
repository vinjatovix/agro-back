// Types for the tests: migrate-mongo only loads the `.js` migrations.
export type MigrationIndexOptions = {
  name: string;
  unique: true;
};

export type MigrationCollection = {
  createIndex(
    key: Record<string, 1>,
    options: MigrationIndexOptions
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb) => Promise<void>;
export declare const down: (db: MigrationDb) => Promise<void>;
