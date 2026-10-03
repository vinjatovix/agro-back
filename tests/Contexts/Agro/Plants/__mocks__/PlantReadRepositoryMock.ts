/* eslint-disable @typescript-eslint/require-await */
import type {
  PlantReadRepository,
  PlantReadView
} from '../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { PlantFilter } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

/** In-memory read port: returns stored views as they are, like storage. */
export class PlantReadRepositoryMock implements PlantReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findActiveByIdMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly storage = new Map<string, PlantReadView>();

  async findById(id: string): Promise<Nullable<PlantReadView>> {
    this.findByIdMock(id);

    return this.storage.get(id) ?? null;
  }

  async findActiveById(id: string): Promise<Nullable<PlantReadView>> {
    this.findActiveByIdMock(id);

    const view = this.storage.get(id);

    return view && view.status !== 'DELETED' ? view : null;
  }

  async findAll(
    options?: QueryOptions<PlantFilter>
  ): Promise<PaginatedResult<PlantReadView>> {
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

  addToStorage(view: PlantReadView): void {
    this.storage.set(view.id, view);
  }

  /* ---------- assertions ---------- */

  assertFindByIdHasBeenCalledWith(id: string): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id);
  }

  assertFindByIdNotCalled(): void {
    expect(this.findByIdMock).not.toHaveBeenCalled();
  }

  assertFindActiveByIdHasBeenCalledWith(id: string): void {
    expect(this.findActiveByIdMock).toHaveBeenCalledWith(id);
  }

  assertFindActiveByIdNotCalled(): void {
    expect(this.findActiveByIdMock).not.toHaveBeenCalled();
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }
}
