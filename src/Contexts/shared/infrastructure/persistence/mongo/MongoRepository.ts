import type { Binary } from 'bson';
import {
  Collection,
  Db,
  MongoServerError,
  type ClientSession,
  type Document
} from 'mongodb';

import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { MongoErrorHandler } from './MongoErrorHandler.js';
import { toMongoId } from './MongoId.js';
import { currentSession } from './MongoSessionContext.js';

export abstract class MongoRepository {
  constructor(protected readonly db: Db) {}

  protected abstract collectionName(): string;
  protected abstract entityName(): string;

  protected collection(): Collection<Document & { _id: string | Binary }> {
    return this.db.collection<Document & { _id: string | Binary }>(
      this.collectionName()
    );
  }

  /**
   * Options that put a driver call inside the active unit of work, if any.
   * Every write and every read a unit relies on must pass them; a call that
   * forgets them runs outside the transaction.
   */
  protected sessionOptions(): { session?: ClientSession } {
    const session = currentSession();

    return session === undefined ? {} : { session };
  }

  protected async persist(
    mongoDocument: Document & { _id: string | Binary }
  ): Promise<void> {
    const collection = this.collection();

    await this.handleMongoError(() =>
      collection.updateOne(
        { _id: mongoDocument._id },
        { $set: mongoDocument },
        { upsert: true, ...this.sessionOptions() }
      )
    );
  }

  protected async delete(id: string): Promise<void> {
    const collection = this.collection();
    const _id = toMongoId(id);

    await this.handleMongoError(() =>
      collection.deleteOne({ _id }, this.sessionOptions())
    );
  }

  protected async handleMongoError<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err: unknown) {
      if (err instanceof MongoServerError) {
        MongoErrorHandler.formatError(err);
      }
      throw err;
    }
  }

  protected normalizePatch(diff: UnknownRecord): {
    set: UnknownRecord;
    unset: Record<string, ''>;
  } {
    const set: UnknownRecord = {};
    const unset: Record<string, ''> = {};

    for (const [key, value] of Object.entries(diff.set ?? {})) {
      if (value === undefined) continue;

      if (value === null) {
        unset[key] = '';
        continue;
      }

      set[key] = value;
    }

    for (const key of Object.keys(diff.unset ?? {})) {
      unset[key] = '';
    }

    return { set, unset };
  }
}
