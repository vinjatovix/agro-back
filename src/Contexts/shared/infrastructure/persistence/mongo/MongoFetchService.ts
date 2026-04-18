import {
  Collection,
  type Document,
  type Filter,
  type FindOptions
} from 'mongodb';
import { toMongoId } from './MongoId.js';
import type { Entity } from './types/Entity.js';

export type MongoFetchOptions = {
  fields?: string[];
  filter?: Record<string, unknown>;
};

export class MongoFetchService {
  public static async fetch<
    T extends Entity,
    TCollectionSchema extends Document = Document
  >({
    collection,
    id,
    options
  }: {
    collection: Collection<TCollectionSchema>;
    id?: string;
    options: MongoFetchOptions;
  }): Promise<T[]> {
    const query: Record<string, unknown> = {
      ...(id ? { _id: toMongoId(id) } : {}),
      ...(options.filter ?? {})
    };

    const projection = options.fields?.length
      ? options.fields.reduce(
          (acc, field) => ({ ...acc, [field]: 1 }),
          { _id: 1, metadata: 1 } as Record<string, number>
        )
      : undefined;

    const mongoQuery = query as Filter<TCollectionSchema>;
    const mongoOptions = (projection ? { projection } : {}) as FindOptions;

    if (!Object.keys(query).length && !projection) {
      return (await collection.find({} as Filter<TCollectionSchema>).toArray()) as unknown as T[];
    }

    return (await collection.find(mongoQuery, mongoOptions).toArray()) as unknown as T[];
  }
}
