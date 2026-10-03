import type {
  CollationOptions,
  Collection,
  Document,
  FindCursor,
  FindOptions
} from 'mongodb';
import type { PaginationMeta } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { PaginationParams } from '../../../../../shared/domain/query/interfaces/PaginationParams.js';
import type { SortOptions } from '../../../../../shared/domain/query/interfaces/SortOptions.js';
import { normalizePagination } from '../../../application/utils/normalizePagination.js';

export type PageQueryOptions = {
  /** Already translated to a Mongo filter. */
  filter: Record<string, unknown>;
  sort?: SortOptions;
  pagination?: PaginationParams;
  collation?: CollationOptions;
  /** Maps a public sort key to its stored path; the same key by default. */
  toSortField?: (key: string) => string;
  /** Inclusion projection; `_id` is always returned. */
  projection?: Document;
};

export type PageQueryResult<TDocument> = {
  documents: TDocument[];
  pagination: PaginationMeta;
};

/** The two collection methods a page query needs. */
export type PagedCollection = Pick<
  Collection<Document>,
  'countDocuments' | 'find'
>;

const sameKey = (key: string): string => key;

/**
 * One listing query shared by the write and read repositories: count, sort,
 * collation, pagination and page metadata. Returns stored documents as they
 * are; mapping them is up to the caller.
 */
export class MongoPageQuery {
  static async find<TDocument extends Document>(
    collection: PagedCollection,
    options: PageQueryOptions
  ): Promise<PageQueryResult<TDocument>> {
    const { filter, sort, collation, projection } = options;
    const pagination = normalizePagination(options.pagination);
    const countOptions = collation ? { collation } : {};
    const findOptions: FindOptions = {
      ...countOptions,
      ...(projection ? { projection } : {})
    };

    const cursor = collection.find<TDocument>(filter, findOptions);

    this.applySort(cursor, sort, options.toSortField ?? sameKey);
    this.applyPagination(cursor, pagination);

    // Independent reads: sent together to save a round-trip.
    const [totalItems, documents] = await Promise.all([
      collection.countDocuments(filter, countOptions),
      cursor.toArray()
    ]);
    const page = pagination?.page ?? 1;
    const limit = (pagination?.limit ?? totalItems) || 1;

    return {
      documents,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems
      }
    };
  }

  private static applySort(
    cursor: FindCursor,
    sort: SortOptions | undefined,
    toSortField: (key: string) => string
  ): void {
    if (!sort) return;

    const mongoSort: Record<string, 1 | -1> = {};

    for (const field in sort) {
      mongoSort[toSortField(field)] = sort[field] === 'asc' ? 1 : -1;
    }

    cursor.sort(mongoSort);
  }

  private static applyPagination(
    cursor: FindCursor,
    pagination?: PaginationParams
  ): void {
    if (!pagination) return;

    const { page, limit } = pagination;

    cursor.skip((page - 1) * limit).limit(limit);
  }
}
