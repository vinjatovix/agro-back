export type MigrationCollection = {
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<unknown>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb) => Promise<void>;
export declare const down: (db: MigrationDb) => Promise<void>;
