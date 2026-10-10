// Types for the tests: migrate-mongo only loads the `.js` migrations.
import type { Db } from 'mongodb';

export type MigrationIndex = {
  name: string;
  key: Record<string, number>;
};

export type MigrationIndexOptions = {
  name: string;
};

export type MigrationCollection = {
  indexes(): Promise<MigrationIndex[]>;
  createIndex(
    key: Record<string, number>,
    options: MigrationIndexOptions
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
  drop?(): Promise<boolean>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
  createCollection?(name: string): Promise<unknown>;
};

// A real `Db` too: repository tests run it to get the production indexes.
export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
