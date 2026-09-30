import type { CollationOptions, FindCursor } from 'mongodb';
import { diffObjects } from '../../../../../shared/domain/diff/diffObjects.js';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { SortOptions } from '../../../../../shared/domain/query/interfaces/SortOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../shared/domain/errors/index.js';
import type { WriteOutcome } from '../../../../shared/domain/repositories/WriteOutcome.js';
import { normalizePagination } from '../../../application/utils/normalizePagination.js';
import { toMongoId } from './MongoId.js';
import { MongoQueryTranslator } from './MongoQueryTranslator.js';
import { MongoRepository } from './MongoRepository.js';
import type { Entity, WithId } from './types/index.js';

export abstract class MongoCrudRepository<
  TDomain,
  TPrimitives extends WithId,
  TDocument extends Entity,
  TFilter
> extends MongoRepository {
  protected abstract toDomain(doc: TDocument): TDomain;
  protected abstract toMongoDocument(entity: TDomain): TDocument;
  protected abstract entityName(): string;

  protected activeFilter(): UnknownRecord {
    return {};
  }

  protected applySort(cursor: FindCursor, sort?: SortOptions): void {
    if (!sort) return;

    const mongoSort: Record<string, 1 | -1> = {};

    for (const field in sort) {
      mongoSort[field] = sort[field] === 'asc' ? 1 : -1;
    }

    cursor.sort(mongoSort);
  }

  protected getCollation(): CollationOptions | undefined {
    return undefined;
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

  async findById(id: string): Promise<Nullable<TDomain>> {
    return this.findOneDomain({ _id: toMongoId(id) });
  }

  async findActiveById(id: string): Promise<Nullable<TDomain>> {
    return this.findOneDomain({
      _id: toMongoId(id),
      ...this.activeFilter()
    });
  }

  protected async findOneDomain(
    filter: Record<string, unknown>
  ): Promise<Nullable<TDomain>> {
    const document = await this.collection().findOne<TDocument>(filter);

    return document === null ? null : this.toDomain(document);
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
    const collation = this.getCollation();
    const findOptions = collation ? { collation } : {};

    const totalItems = await collection.countDocuments(
      mongoFilter,
      findOptions
    );

    const cursor = collection.find<TDocument>(mongoFilter, findOptions);

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

  /**
   * Receives two complete states of the same aggregate, both produced by the
   * same domain mapper (`toPrimitives` before and after the mutation method).
   * MUST NOT receive a partial object or patch: a field missing from `updated`
   * is removed (`$unset`).
   *
   * Writes exactly the diff plus `$inc: { version: 1 }`; audit metadata is
   * owned by the aggregate and never added here. An empty diff writes nothing
   * but is confirmed against storage with the same filter as a write.
   *
   * Returns `written` (version advanced by one) or `unchanged` (confirmed
   * no-op), never a version number.
   */
  async updateWithDiff(
    current: TPrimitives,
    updated: TPrimitives
  ): Promise<WriteOutcome> {
    const mongoId = toMongoId(current.id);
    const patch = this.normalizePatch(diffObjects(current, updated));

    const hasSet = Object.keys(patch.set).length > 0;
    const hasUnset = Object.keys(patch.unset).length > 0;

    // `$and` keeps both conditions even if activeFilter() and versionFilter
    // ever use the same top-level operator (e.g. both `$or`).
    const writeFilter = {
      _id: mongoId,
      $and: [this.activeFilter(), this.versionFilter(current.version)]
    };

    if (!hasSet && !hasUnset) {
      const matches = await this.collection().countDocuments(writeFilter, {
        limit: 1
      });

      if (matches > 0) return 'unchanged';

      return this.throwFailedWrite(current.id);
    }

    const updateQuery: {
      $set?: UnknownRecord;
      $unset?: Record<string, ''>;
      $inc: Record<string, number>;
    } = { $inc: { version: 1 } };

    if (hasSet) updateQuery.$set = patch.set;
    if (hasUnset) updateQuery.$unset = patch.unset;

    const result = await this.collection().updateOne(writeFilter, updateQuery);

    if (result.matchedCount > 0) return 'written';

    return this.throwFailedWrite(current.id);
  }

  /**
   * Optimistic concurrency: only match the version that was read. Documents
   * without a stored version are read as version 0.
   */
  private versionFilter(version: number): UnknownRecord {
    return version === 0
      ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
      : { version };
  }

  /**
   * Only runs after a failed conditional write or no-op confirmation, to tell
   * a stale version (412) from a missing or inactive document (404). A
   * concurrent delete landing between the failed check and this count yields
   * 404 instead of 412; that is accepted because the resource is indeed gone.
   */
  private async throwFailedWrite(id: string): Promise<never> {
    const isStale =
      (await this.collection().countDocuments({
        _id: toMongoId(id),
        ...this.activeFilter()
      })) > 0;

    if (isStale) {
      throw new DomainStaleVersionException(
        `${this.entityName()} was modified concurrently: ${id}`
      );
    }

    throw new DomainNotFoundException(`${this.entityName()} not found: ${id}`);
  }
}
