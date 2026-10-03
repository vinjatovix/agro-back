import type { CollationOptions, Collection, Db, Document } from 'mongodb';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from './MongoId.js';
import { MongoPageQuery } from './MongoPageQuery.js';
import { MongoQueryTranslator } from './MongoQueryTranslator.js';

/**
 * Read side of a catalog (CQRS read bypass): fetches only the contract fields
 * and maps each stored document straight to a read view. It never builds an
 * aggregate and has no write methods. Filtering, sorting and paging go
 * through `MongoPageQuery`, like the write repository's `findAll`, so both
 * paths answer the same query the same way.
 */
export abstract class MongoReadRepository<
  TDocument extends Document,
  TFilter,
  TView
> {
  constructor(protected readonly db: Db) {}

  protected abstract collectionName(): string;
  protected abstract toView(document: TDocument): TView;
  /** Inclusion projection of the contract fields; `_id` is always returned. */
  protected abstract projection(): Readonly<Record<string, 1>>;

  /** Same default as `MongoCrudRepository`: no collation. */
  protected getCollation(): CollationOptions | undefined {
    return undefined;
  }

  /** Maps a public sort key to its stored path; the same by default. */
  protected toMongoSortField(key: string): string {
    return key;
  }

  protected toMongoFilter(filter?: TFilter): Record<string, unknown> {
    return MongoQueryTranslator.toMongo(filter as Record<string, unknown>);
  }

  async findById(id: string): Promise<Nullable<TView>> {
    return this.findOneView({ _id: toMongoId(id) });
  }

  async findAll(
    options: Partial<QueryOptions<TFilter>> = {}
  ): Promise<PaginatedResult<TView>> {
    return this.findPage(options);
  }

  protected collection(): Collection<Document> {
    return this.db.collection(this.collectionName());
  }

  protected async findOneView(filter: UnknownRecord): Promise<Nullable<TView>> {
    const document = await this.collection().findOne<TDocument>(filter, {
      projection: this.projection()
    });

    return document === null ? null : this.toView(document);
  }

  protected async findPage(
    options: Partial<QueryOptions<TFilter>>
  ): Promise<PaginatedResult<TView>> {
    const collation = this.getCollation();
    const { documents, pagination } = await MongoPageQuery.find<TDocument>(
      this.collection(),
      {
        filter: this.toMongoFilter(options.filter),
        projection: this.projection(),
        toSortField: (key) => this.toMongoSortField(key),
        ...(options.sort && { sort: options.sort }),
        ...(options.pagination && { pagination: options.pagination }),
        ...(collation && { collation })
      }
    );

    return {
      data: documents.map((document) => this.toView(document)),
      pagination
    };
  }
}
