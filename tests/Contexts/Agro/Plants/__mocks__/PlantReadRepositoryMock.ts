/* eslint-disable @typescript-eslint/require-await */
import type {
  PlantField,
  PlantReadRepository,
  PlantReadView,
  PlantSparseView
} from '../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { PlantFilter } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { PlantReadViewMother } from '../application/queries/PlantReadViewMother.js';

/**
 * In-memory read port: returns stored views as they are, like storage, or only
 * `id` and the requested fields when the read has a fieldset.
 */
export class PlantReadRepositoryMock implements PlantReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findActiveByIdMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly storage = new Map<string, PlantReadView>();

  async findById(
    id: string,
    options: ReadOptions<PlantField> = {}
  ): Promise<Nullable<PlantSparseView>> {
    this.findByIdMock(id, options);

    const view = this.storage.get(id);

    return view ? this.select(view, options) : null;
  }

  async findActiveById(
    id: string,
    options: ReadOptions<PlantField> = {}
  ): Promise<Nullable<PlantSparseView>> {
    this.findActiveByIdMock(id, options);

    const view = this.storage.get(id);

    return view && view.status !== 'DELETED'
      ? this.select(view, options)
      : null;
  }

  async findAll(
    options?: Omit<QueryOptions<PlantFilter, PlantField>, 'include'>
  ): Promise<PaginatedResult<PlantSparseView>> {
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

  private select(
    view: PlantReadView,
    { fields }: ReadOptions<PlantField>
  ): PlantSparseView {
    return fields === undefined
      ? view
      : PlantReadViewMother.sparse(view, fields);
  }

  /* ---------- helpers ---------- */

  addToStorage(view: PlantReadView): void {
    this.storage.set(view.id, view);
  }

  /* ---------- assertions ---------- */

  assertFindByIdHasBeenCalledWith(id: string, options: unknown = {}): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id, options);
  }

  assertFindByIdNotCalled(): void {
    expect(this.findByIdMock).not.toHaveBeenCalled();
  }

  assertFindActiveByIdHasBeenCalledWith(
    id: string,
    options: unknown = {}
  ): void {
    expect(this.findActiveByIdMock).toHaveBeenCalledWith(id, options);
  }

  assertFindActiveByIdNotCalled(): void {
    expect(this.findActiveByIdMock).not.toHaveBeenCalled();
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }
}
