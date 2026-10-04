/* eslint-disable @typescript-eslint/require-await */
import type {
  FamilyField,
  FamilyReadRepository,
  FamilyReadView,
  FamilySparseView,
  FamilySummary
} from '../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import type { FamilyFilter } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { FamilyReadViewMother } from '../application/queries/FamilyReadViewMother.js';

/**
 * In-memory read port: returns stored views as they are, like storage, or only
 * `id` and the requested fields when the read has a fieldset.
 */
export class FamilyReadRepositoryMock implements FamilyReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findBySlugMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly findSummariesByIdsMock = jest.fn();
  private readonly storage = new Map<string, FamilyReadView>();

  async findById(
    id: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<Nullable<FamilySparseView>> {
    this.findByIdMock(id, options);

    const view = this.storage.get(id);

    return view ? this.select(view, options) : null;
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<Nullable<FamilySparseView>> {
    this.findBySlugMock(slug, options);

    const view = [...this.storage.values()].find((item) => item.slug === slug);

    return view ? this.select(view, options) : null;
  }

  async findAll(
    options?: Omit<QueryOptions<FamilyFilter, FamilyField>, 'include'>
  ): Promise<PaginatedResult<FamilySparseView>> {
    this.findAllMock(options);

    const data = [...this.storage.values()].map((view) =>
      this.select(view, options ?? {})
    );

    return {
      data,
      pagination: {
        page: 1,
        limit: data.length || 1,
        totalPages: data.length > 0 ? 1 : 0,
        totalItems: data.length
      }
    };
  }

  async findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly FamilySummary[]> {
    this.findSummariesByIdsMock(ids);

    return ids.flatMap((id) => {
      const view = this.storage.get(id);

      return view ? [{ id: view.id, name: view.name, slug: view.slug }] : [];
    });
  }

  private select(
    view: FamilyReadView,
    { fields }: ReadOptions<FamilyField>
  ): FamilySparseView {
    return fields === undefined
      ? view
      : FamilyReadViewMother.sparse(view, fields);
  }

  /* ---------- helpers ---------- */

  addToStorage(view: FamilyReadView): void {
    this.storage.set(view.id, view);
  }

  /* ---------- assertions ---------- */

  assertFindByIdHasBeenCalledWith(id: string, options: unknown = {}): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id, options);
  }

  assertFindBySlugHasBeenCalledWith(slug: string, options: unknown = {}): void {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug, options);
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }

  assertFindSummariesByIdsHasBeenCalledWith(ids: readonly string[]): void {
    expect(this.findSummariesByIdsMock).toHaveBeenCalledWith(ids);
  }
}
