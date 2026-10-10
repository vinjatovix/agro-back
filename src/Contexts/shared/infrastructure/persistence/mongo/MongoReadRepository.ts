import type { CollationOptions, Collection, Db, Document } from 'mongodb';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from './MongoId.js';
import { MongoPageQuery } from './MongoPageQuery.js';
import { MongoQueryTranslator } from './MongoQueryTranslator.js';

/** A computed projection key: an aggregation operator such as `$first`. */
export type ProjectionExpression = Readonly<Record<`$${string}`, unknown>>;

/** Stored fields (`1`) and computed keys (an expression), never exclusions. */
export type ReadProjection = Readonly<Record<string, 1 | ProjectionExpression>>;

/**
 * Read side of a catalog (CQRS read bypass): fetches only the contract fields
 * and maps each stored document straight to a read view. It never builds an
 * aggregate and has no write methods. Filtering, sorting and paging go
 * through `MongoPageQuery`, like the write repository's `findAll`, so both
 * paths answer the same query the same way.
 *
 * A read with `fields` fetches only those fields (and `_id`): unrequested
 * fields are never read.
 */
export abstract class MongoReadRepository<
  TDocument extends Document,
  TFilter,
  TView,
  TField extends string = never
> {
  constructor(protected readonly db: Db) {}

  protected abstract collectionName(): string;
  /** Maps a document read with `fields` (every field when absent). */
  protected abstract toView(
    document: TDocument,
    fields?: readonly TField[]
  ): TView;
  /** Inclusion projection of the contract fields; `_id` is always returned. */
  protected abstract projection(): ReadProjection;

  /**
   * The contract projection narrowed to `fields`; never an exclusion
   * projection, so unknown stored fields still never leave the database. `_id`
   * is named so that an empty fieldset does not read the whole document.
   */
  protected projectionOf(fields?: readonly TField[]): ReadProjection {
    const projection = this.projection();
    if (fields === undefined) return projection;

    const selected = new Set<string>(fields);

    return Object.fromEntries([
      ['_id', 1],
      ...Object.entries(projection).filter(([key]) => selected.has(key))
    ]);
  }

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

  async findById(
    id: string,
    options: ReadOptions<TField> = {}
  ): Promise<Nullable<TView>> {
    return this.findOneView({ _id: toMongoId(id) }, options);
  }

  async findAll(
    options: Partial<QueryOptions<TFilter, TField>> = {}
  ): Promise<PaginatedResult<TView>> {
    return this.findPage(options);
  }

  protected collection(): Collection<Document> {
    return this.db.collection(this.collectionName());
  }

  protected async findOneView(
    filter: UnknownRecord,
    { fields }: ReadOptions<TField> = {}
  ): Promise<Nullable<TView>> {
    const document = await this.collection().findOne<TDocument>(filter, {
      projection: this.projectionOf(fields)
    });

    return document === null ? null : this.toView(document, fields);
  }

  protected async findPage(
    options: Partial<QueryOptions<TFilter, TField>>
  ): Promise<PaginatedResult<TView>> {
    const { fields } = options;
    const collation = this.getCollation();
    const { documents, pagination } = await MongoPageQuery.find<TDocument>(
      this.collection(),
      {
        filter: this.toMongoFilter(options.filter),
        projection: this.projectionOf(fields),
        toSortField: (key) => this.toMongoSortField(key),
        ...(options.sort && { sort: options.sort }),
        ...(options.pagination && { pagination: options.pagination }),
        ...(collation && { collation })
      }
    );

    return {
      data: documents.map((document) => this.toView(document, fields)),
      pagination
    };
  }
}
