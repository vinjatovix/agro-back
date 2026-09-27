/* eslint-disable @typescript-eslint/require-await */

import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../src/Contexts/shared/domain/errors/index.js';
import { diffObjects } from '../../../../src/shared/domain/diff/diffObjects.js';
import { applyPatch } from '../../../../src/shared/domain/patch/applyPatch.js';
import type { PaginatedResult } from '../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';

export type RepositoryReadMethod =
  | 'findById'
  | 'findActiveById'
  | 'findOwnedActiveById';

export abstract class BaseMongoCrudRepositoryMock<
  TEntity extends { id: string; version: number },
  TPrimitives extends { id: string; version: number }
> {
  protected readonly saveMock = jest.fn();
  protected readonly findByIdMock = jest.fn();
  protected readonly findActiveByIdMock = jest.fn();
  protected readonly findAllMock = jest.fn();
  protected readonly existsMock = jest.fn();
  protected readonly updateMock = jest.fn();
  protected readonly existenceCountMock = jest.fn();
  protected readonly readCalls: Record<RepositoryReadMethod, number> = {
    findById: 0,
    findActiveById: 0,
    findOwnedActiveById: 0
  };

  protected readonly storage: Map<string, TEntity> = new Map();
  private readonly persisted = new Map<
    string,
    { version: number; active: boolean }
  >();
  private failOnSave = false;

  protected abstract toDomain(primitives: TPrimitives): TEntity;
  protected abstract entityName(): string;

  protected isActive(_entity: TEntity): boolean {
    return true;
  }

  async save(entity: TEntity): Promise<void> {
    this.saveMock(entity);

    if (this.failOnSave) {
      throw new DomainConflictException('Save failed');
    }

    this.store(entity);
  }

  async findById(id: string): Promise<Nullable<TEntity>> {
    this.findByIdMock(id);
    this.readCalls.findById += 1;

    return this.storage.get(id) ?? null;
  }

  async findActiveById(id: string): Promise<Nullable<TEntity>> {
    this.findActiveByIdMock(id);
    this.readCalls.findActiveById += 1;

    const entity = this.storage.get(id);

    return entity && this.isActive(entity) ? entity : null;
  }

  async findAll(
    options?: QueryOptions<unknown>
  ): Promise<PaginatedResult<TEntity>> {
    this.findAllMock(options);

    let result = Array.from(this.storage.values());

    if (options?.pagination) {
      const { page, limit } = options.pagination;
      const start = (page - 1) * limit;
      result = result.slice(start, start + limit);
    }

    return {
      data: result,
      pagination: {
        totalItems: result.length,
        page: options?.pagination?.page || 1,
        limit: options?.pagination?.limit || result.length,
        totalPages: 1
      }
    };
  }

  async exists(id: string): Promise<boolean> {
    this.existsMock(id);
    return this.storage.has(id);
  }

  /**
   * Mirrors MongoCrudRepository.updateWithDiff: an empty diff is a no-op,
   * otherwise the write only lands on an active entity persisted with
   * `current.version`, and bumps it by one. A failed conditional write runs
   * one existence check to tell a stale version from a missing entity.
   *
   * The check uses the persisted snapshot, not the stored instance, because
   * use cases may mutate the instance they read (e.g. `markAsDeleted()`)
   * before writing it, which a database copy would not see.
   */
  async updateWithDiff(
    current: TPrimitives,
    updated: unknown,
    username: string
  ): Promise<void> {
    this.updateMock(current, updated, username);

    const id = current.id;
    const patched = applyPatch(current, updated as TPrimitives);

    if (!this.hasChanges(current, patched)) return;

    const persisted = this.persisted.get(id);

    if (persisted?.active && persisted.version === current.version) {
      this.store(this.toDomain({ ...patched, version: current.version + 1 }));
      return;
    }

    this.existenceCountMock(id);

    if (persisted?.active) {
      throw new DomainStaleVersionException(
        `${this.entityName()} was modified concurrently: ${id}`
      );
    }

    throw new DomainNotFoundException(`${this.entityName()} not found: ${id}`);
  }

  /** Same rule as MongoRepository.normalizePatch: `undefined` is ignored. */
  private hasChanges(current: TPrimitives, patched: TPrimitives): boolean {
    const diff = diffObjects(current, patched);

    return (
      Object.values(diff.set).some((value) => value !== undefined) ||
      Object.keys(diff.unset).length > 0
    );
  }

  private store(entity: TEntity): void {
    this.storage.set(entity.id, entity);
    this.persisted.set(entity.id, {
      version: entity.version,
      active: this.isActive(entity)
    });
  }

  /* ---------- helpers ---------- */

  addToStorage(entity: TEntity): void {
    this.store(entity);
  }

  getStored(id: string): TEntity | undefined {
    return this.storage.get(id);
  }

  clear(): void {
    this.storage.clear();
    this.persisted.clear();
    jest.clearAllMocks();
    this.failOnSave = false;
    this.resetCallCounters();
  }

  resetCallCounters(): void {
    for (const method of Object.keys(
      this.readCalls
    ) as RepositoryReadMethod[]) {
      this.readCalls[method] = 0;
    }
    this.updateMock.mockClear();
    this.existenceCountMock.mockClear();
  }

  simulateSaveFailure(): void {
    this.failOnSave = true;
  }

  /* ---------- assertions ---------- */

  assertSaveCalled(): void {
    expect(this.saveMock).toHaveBeenCalled();
  }

  assertSaveHasBeenCalledWith(entity: TEntity): void {
    expect(this.saveMock).toHaveBeenCalledWith(entity);
  }

  assertSaveNotCalled(): void {
    expect(this.saveMock).not.toHaveBeenCalled();
  }

  assertUpdateCalled(): void {
    expect(this.updateMock).toHaveBeenCalled();
  }

  assertUpdateHasBeenCalledWith(
    current: TPrimitives,
    updated: unknown,
    username: string
  ): void {
    expect(this.updateMock).toHaveBeenCalledWith(current, updated, username);
  }

  assertUpdateNotCalled(): void {
    expect(this.updateMock).not.toHaveBeenCalled();
  }

  assertFindAllCalled(): void {
    expect(this.findAllMock).toHaveBeenCalled();
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }

  assertExistsCalledWith(id: string): void {
    expect(this.existsMock).toHaveBeenCalledWith(id);
  }

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

  assertReadCalledTimes(method: RepositoryReadMethod, times: number): void {
    expect(this.readCalls[method]).toBe(times);
  }

  assertUpdateCalledTimes(times: number): void {
    expect(this.updateMock).toHaveBeenCalledTimes(times);
  }

  assertExistenceCountCalledTimes(times: number): void {
    expect(this.existenceCountMock).toHaveBeenCalledTimes(times);
  }
}
