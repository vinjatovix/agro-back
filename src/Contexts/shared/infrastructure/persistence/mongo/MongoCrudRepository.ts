import type { FindCursor } from 'mongodb';
import { diffObjects } from '../../../../../shared/domain/diff/diffObjects.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { createError } from '../../../../../shared/errors/index.js';
import { Username } from '../../../../Auth/domain/value-objects/Username.js';
import { updateMetadata } from '../../../application/utils/updateMetadata.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { SortOptions } from '../../../../../shared/domain/query/interfaces/SortOptions.js';
import { toMongoId } from './MongoId.js';
import { MongoQueryTranslator } from './MongoQueryTranslator.js';
import { MongoRepository } from './MongoRepository.js';
import type { Entity, WithId } from './types/index.js';
import { normalizePagination } from '../../../application/utils/normalizePagination.js';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';

export abstract class MongoCrudRepository<
  TDomain,
  TPrimitives extends WithId,
  TDocument extends Entity,
  TFilter
> extends MongoRepository {
  protected abstract toDomain(doc: TDocument): TDomain;
  protected abstract toMongoDocument(entity: TDomain): TDocument;
  protected abstract entityName(): string;

  protected applySort(cursor: FindCursor, sort?: SortOptions): void {
    if (!sort) return;

    const mongoSort: Record<string, 1 | -1> = {};

    for (const field in sort) {
      mongoSort[field] = sort[field] === 'asc' ? 1 : -1;
    }

    cursor.sort(mongoSort);
  }

  protected applyPagination(
    cursor: FindCursor,
    pagination?: { page: number; limit: number }
  ): void {
    if (!pagination) return;

    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

    cursor.skip(skip).limit(limit);
  }

  async findById(id: string): Promise<TDomain> {
    const collection = this.collection();

    const document = await collection.findOne<TDocument>({
      _id: toMongoId(id)
    });

    if (!document) {
      throw createError.notFound(`${this.entityName()} not found: ${id}`);
    }

    return this.toDomain(document);
  }

  async save(entity: TDomain & { id: { value: string } }): Promise<void> {
    const mongoDocument = this.toMongoDocument(entity);
    await this.persist(mongoDocument);
  }

  async findAll(
    options: Partial<QueryOptions<TFilter>> = {}
  ): Promise<PaginatedResult<TDomain>> {
    const collection = this.collection();

    const { filter, sort, pagination } = options;
    const safePagination = normalizePagination(pagination);

    const mongoFilter = this.toMongoFilter(filter);
    const totalItems = await collection.countDocuments(mongoFilter);
    const cursor = collection.find<TDocument>(mongoFilter);

    this.applySort(cursor, sort);
    this.applyPagination(cursor, safePagination);

    const docs = await cursor.toArray();
    const page = safePagination?.page ?? 1;
    const limit = (safePagination?.limit ?? totalItems) || 1;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: docs.map((doc) => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        totalPages,
        totalItems
      }
    };
  }
  async exists(id: string): Promise<boolean> {
    const collection = this.collection();

    const count = await collection.countDocuments({
      _id: toMongoId(id)
    });

    return count > 0;
  }

  protected toMongoFilter(filter?: TFilter): Record<string, unknown> {
    return MongoQueryTranslator.toMongo(filter as Record<string, unknown>);
  }

  async updateWithDiff(
    current: TPrimitives,
    updated: TPrimitives,
    username: string
  ): Promise<void> {
    const collection = this.collection();

    const mongoId = toMongoId(current.id);

    const diff = diffObjects(current, updated);
    const patch = this.normalizePatch(diff);

    const hasSet = Object.keys(patch.set).length > 0;
    const hasUnset = Object.keys(patch.unset).length > 0;

    if (!hasSet && !hasUnset) return;

    const metadata = updateMetadata(
      new Username(username)
    ) as unknown as UnknownRecord;

    const updateQuery: {
      $set?: UnknownRecord;
      $unset?: Record<string, ''>;
    } = {};

    updateQuery.$set = hasSet ? { ...patch.set, ...metadata } : metadata;

    if (hasUnset) {
      updateQuery.$unset = patch.unset;
    }

    const result = await collection.updateOne({ _id: mongoId }, updateQuery);

    if (result.matchedCount === 0) {
      throw createError.notFound(
        `${this.entityName()} not found: ${current.id}`
      );
    }
  }
}
