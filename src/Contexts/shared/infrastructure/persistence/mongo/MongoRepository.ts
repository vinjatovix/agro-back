import type { Binary } from 'bson';
import {
  Collection,
  MongoClient,
  MongoServerError,
  type Document
} from 'mongodb';
import type { Username } from '../../../../agroApi/Auth/domain/Username.js';
import { updateMetadata } from '../../../application/utils/updateMetadata.js';
import { MongoErrorHandler } from './MongoErrorHandler.js';
import { toMongoId } from './MongoId.js';
import type { Entity } from './types/Entity.js';
import {
  MongoFetchService,
  type MongoFetchOptions
} from './MongoFetchService.js';
import type { RequestOptions } from '../../../../../apps/agroApi/shared/interfaces/RequestOptions.js';
import type { Serializable } from '../../../domain/interfaces/Serializable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';

export abstract class MongoRepository<T extends Serializable<unknown>> {
  constructor(private readonly DBClient: Promise<MongoClient>) {}

  protected abstract collectionName(): string;

  protected client(): Promise<MongoClient> {
    return this.DBClient;
  }

  protected async collection(): Promise<
    Collection<Document & { _id: string | Binary }>
  > {
    return (await this.client())
      .db()
      .collection<Document & { _id: string | Binary }>(this.collectionName());
  }

  protected async persist(
    id: string,
    aggregateRoot: T,
    username?: Username
  ): Promise<void> {
    const collection = await this.collection();
    const mongoId = toMongoId(id);
    const document = {
      ...(aggregateRoot.toPrimitives() as UnknownRecord),
      id: undefined,
      ...(username && updateMetadata(username))
    };

    await this.handleMongoError(
      async () =>
        await collection.updateOne(
          { _id: mongoId },
          { $set: document },
          { upsert: true }
        )
    );
  }

  protected async delete(id: string): Promise<void> {
    const collection = await this.collection();
    await this.handleMongoError(
      async () => await collection.deleteOne({ _id: toMongoId(id) })
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

  protected async fetch<T extends Entity>({
    id,
    options
  }: {
    id?: string;
    options: MongoFetchOptions;
  }): Promise<T[]> {
    const collection = await this.collection();
    const fetchParams = {
      collection,
      options,
      ...(id !== undefined ? { id } : {})
    };

    return await this.handleMongoError(
      async () =>
        await MongoFetchService.fetch<T, Document & { _id: string | Binary }>(
          fetchParams
        )
    );
  }

  protected processFilterOptions(options: RequestOptions): MongoFetchOptions {
    const baseOptions: MongoFetchOptions = {
      ...(options.fields !== undefined ? { fields: options.fields } : {})
    };

    if (!options.filter) {
      return baseOptions;
    }

    const filter = options.filter.reduce((acc, curr) => {
      const separatorIndex = curr.indexOf(':');
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = curr.slice(0, separatorIndex).trim();
      const value = curr.slice(separatorIndex + 1).trim();

      if (!key || !value) {
        return acc;
      }

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
}
