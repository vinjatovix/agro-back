// Types for the tests: migrate-mongo only loads the `.js` migrations.
import type { Db } from 'mongodb';

export type MigrationIndexOptions = {
  name: string;
  unique: true;
  sparse: true;
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

// A real `Db` too: repository tests run it to get the production index.
export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
