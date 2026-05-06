import type { Binary } from 'bson';
import { Collection, Db, MongoServerError, type Document } from 'mongodb';

import type { Username } from '../../../../Auth/domain/value-objects/Username.js';
import { updateMetadata } from '../../../application/utils/updateMetadata.js';
import { MongoErrorHandler } from './MongoErrorHandler.js';
import { toMongoId } from './MongoId.js';
import type { Entity } from './types/Entity.js';
import {
  MongoFetchService,
  type MongoFetchOptions
} from './MongoFetchService.js';
import type { RequestOptions } from '../../../../../apps/agroApi/shared/interfaces/RequestOptions.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';

export abstract class MongoRepository {
  constructor(protected readonly db: Db) {}

  protected abstract collectionName(): string;
  protected abstract entityName(): string;

  protected collection(): Collection<Document & { _id: string | Binary }> {
    return this.db.collection<Document & { _id: string | Binary }>(
      this.collectionName()
    );
  }

  protected async persist(
    mongoDocument: Document & { _id: string | Binary },
    username?: Username
  ): Promise<void> {
    const collection = this.collection();

    const finalDocument = {
      ...mongoDocument,
      ...(username && updateMetadata(username))
    };

    await this.handleMongoError(() =>
      collection.updateOne(
        { _id: mongoDocument._id },
        { $set: finalDocument },
        { upsert: true }
      )
    );
  }

  protected async delete(id: string): Promise<void> {
    const collection = this.collection();
    const _id = toMongoId(id);

    await this.handleMongoError(() => collection.deleteOne({ _id }));
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

  protected async fetch<T extends Entity>({
    id,
    options
  }: {
    id?: string;
    options: MongoFetchOptions;
  }): Promise<T[]> {
    const collection = this.collection();

    const fetchParams = {
      collection,
      options,
      ...(id !== undefined ? { id } : {})
    };

    return this.handleMongoError(() =>
      MongoFetchService.fetch<T, Document & { _id: string | Binary }>(
        fetchParams
      )
    );
  }

  protected processFilterOptions(options: RequestOptions): MongoFetchOptions {
    const baseOptions: MongoFetchOptions = {
      ...(options.fields !== undefined ? { fields: options.fields } : {})
    };

    if (!options.filter) return baseOptions;

    const filter = options.filter.reduce((acc, curr) => {
      const separatorIndex = curr.indexOf(':');
      if (separatorIndex <= 0) return acc;

      const key = curr.slice(0, separatorIndex).trim();
      const value = curr.slice(separatorIndex + 1).trim();

      if (!key || !value) return acc;

      return {
        ...acc,
        [key]: value.includes(',') ? { $in: value.split(',') } : value
      };
    }, {} as UnknownRecord);

    return {
      ...baseOptions,
      filter
    };
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
