import type { CollationOptions } from 'mongodb';
import { diffObjects } from '../../../../../shared/domain/diff/diffObjects.js';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../shared/domain/errors/index.js';
import type { WriteOutcome } from '../../../../shared/domain/repositories/WriteOutcome.js';
import { toMongoId } from './MongoId.js';
import { MongoPageQuery } from './MongoPageQuery.js';
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

  /** Maps a public sort key to its stored path; the same by default. */
  protected toMongoSortField(key: string): string {
    return key;
  }

  protected getCollation(): CollationOptions | undefined {
    return undefined;
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
    const { filter, sort, pagination } = options;
    const collation = this.getCollation();

    const { documents, pagination: page } =
      // Untyped handle: the page query only reads, and returns documents
      // typed by the caller.
      await MongoPageQuery.find<TDocument>(
        this.db.collection(this.collectionName()),
        {
          filter: this.toMongoFilter(filter),
          toSortField: (key) => this.toMongoSortField(key),
          ...(sort && { sort }),
          ...(pagination && { pagination }),
          ...(collation && { collation })
        }
      );

    return {
      data: documents.map((doc) => this.toDomain(doc)),
      pagination: page
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

    // A duplicate key (e.g. a slug already in use) answers 409, as on create.
    const result = await this.handleMongoError(() =>
      this.collection().updateOne(writeFilter, updateQuery)
    );

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
