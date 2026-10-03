// Types for the tests: migrate-mongo only loads the `.js` migrations.
export type MigrationPlant = Record<string, unknown> & {
  _id: unknown;
  version?: number;
};

export type MigrationBulkOperation = {
  updateOne: {
    filter: Record<string, unknown>;
    update: Record<string, Record<string, unknown>>;
  };
};

export type MigrationCollection = {
  find(filter: Record<string, never>): AsyncIterable<MigrationPlant>;
  bulkWrite(
    operations: MigrationBulkOperation[]
  ): Promise<{ matchedCount: number }>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb) => Promise<void>;
export declare const down: (db: MigrationDb) => Promise<void>;

export declare class PlantsChangedWhileMigratingError extends Error {
  readonly count: number;
  constructor(count: number);
}
