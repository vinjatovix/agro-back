/* eslint-disable @typescript-eslint/require-await */
import type {
  FamilyReadRepository,
  FamilyReadView
} from '../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import type { FamilyFilter } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

/** In-memory read port: returns stored views as they are, like storage. */
export class FamilyReadRepositoryMock implements FamilyReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findBySlugMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly storage = new Map<string, FamilyReadView>();

  async findById(id: string): Promise<Nullable<FamilyReadView>> {
    this.findByIdMock(id);

    return this.storage.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<FamilyReadView>> {
    this.findBySlugMock(slug);

    return (
      [...this.storage.values()].find((view) => view.slug === slug) ?? null
    );
  }

  async findAll(
    options?: QueryOptions<FamilyFilter>
  ): Promise<PaginatedResult<FamilyReadView>> {
    this.findAllMock(options);

    const data = [...this.storage.values()];

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

  /* ---------- helpers ---------- */

  addToStorage(view: FamilyReadView): void {
    this.storage.set(view.id, view);
  }

  /* ---------- assertions ---------- */

  assertFindByIdHasBeenCalledWith(id: string): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id);
  }

  assertFindBySlugHasBeenCalledWith(slug: string): void {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug);
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }
}
