/* eslint-disable @typescript-eslint/require-await */

import type { QueryOptions } from '../../../../src/Contexts/shared/domain/query/interfaces/QueryOptions.js';
import { applyPatch } from '../../../../src/shared/domain/patch/applyPatch.js';
import { createError } from '../../../../src/shared/errors/index.js';

export abstract class BaseMongoCrudRepositoryMock<
  TEntity extends { id: { value: string } },
  TPrimitives extends { id: string }
> {
  protected readonly saveMock = jest.fn();
  protected readonly findByIdMock = jest.fn();
  protected readonly findAllMock = jest.fn();
  protected readonly existsMock = jest.fn();
  protected readonly updateMock = jest.fn();

  protected readonly storage: Map<string, TEntity> = new Map();
  private failOnSave = false;

  protected abstract toDomain(primitives: TPrimitives): TEntity;
  protected abstract entityName(): string;

  async save(entity: TEntity): Promise<void> {
    this.saveMock(entity);

    if (this.failOnSave) {
      throw createError.conflict('Save failed');
    }

    this.storage.set(entity.id.value, entity);
  }

  async findById(id: string): Promise<TEntity> {
    this.findByIdMock(id);

    const entity = this.storage.get(id);

    if (!entity) {
      throw createError.badRequest(`${this.entityName()} not found: ${id}`);
    }

    return entity;
  }

  async findAll(options?: QueryOptions<unknown>): Promise<TEntity[]> {
    this.findAllMock(options);

    let result = Array.from(this.storage.values());

    if (options?.pagination) {
      const { page, limit } = options.pagination;
      const start = (page - 1) * limit;
      result = result.slice(start, start + limit);
    }

    return result;
  }

  async exists(id: string): Promise<boolean> {
    this.existsMock(id);
    return this.storage.has(id);
  }

  async updateWithDiff(
    current: TPrimitives,
    updated: unknown,
    username: string
  ): Promise<void> {
    this.updateMock(current, updated, username);

    const id = current.id;

    if (!this.storage.has(id)) {
      throw createError.badRequest(`${this.entityName()} not found: ${id}`);
    }

    const patched = applyPatch(current, updated as TPrimitives);

    const updatedEntity = this.toDomain(patched);

    this.storage.set(id, updatedEntity);
  }

  /* ---------- helpers ---------- */

  addToStorage(entity: TEntity): void {
    this.storage.set(entity.id.value, entity);
  }

  clear(): void {
    this.storage.clear();
    jest.clearAllMocks();
    this.failOnSave = false;
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
}
