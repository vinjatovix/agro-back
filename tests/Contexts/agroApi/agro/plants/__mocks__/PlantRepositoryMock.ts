/* eslint-disable @typescript-eslint/require-await */
import { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { plantMapper } from '../../../../../../src/Contexts/agroApi/agro/plants/mappers/plantMapper.js';
import { applyPatch } from '../../../../../../src/shared/domain/patch/applyPatch.js';

export class PlantRepositoryMock implements PlantRepository {
  private readonly saveMock = jest.fn();
  private readonly updateMock = jest.fn();
  private readonly findByIdMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly existsMock = jest.fn();

  private readonly storage: Map<string, Plant> = new Map();
  private failOnSave = false;

  async save(plant: Plant): Promise<void> {
    this.saveMock(plant);

    if (this.failOnSave) {
      throw new Error('Save failed');
    }

    this.storage.set(plant.id.value, plant);
  }

  async findById(id: string): Promise<Plant> {
    this.findByIdMock(id);

    const plant = this.storage.get(id);

    if (!plant) throw new Error(`Plant not found: ${id}`);

    return plant;
  }

  async findAll(): Promise<Plant[]> {
    this.findAllMock();
    return Array.from(this.storage.values());
  }

  async exists(id: string): Promise<boolean> {
    this.existsMock(id);
    return this.storage.has(id);
  }

  async updateWithDiff(
    current: PlantPrimitives,
    updated: unknown,
    username: string
  ): Promise<void> {
    this.updateMock(current, updated, username);

    const id = current.id;

    if (!this.storage.has(id)) {
      throw new Error(`Plant not found: ${id}`);
    }

    const patchedPrimitives = applyPatch(current, updated as PlantPrimitives);

    const updatedPlant = plantMapper.fromPrimitives(patchedPrimitives);

    this.storage.set(id, updatedPlant);
  }

  assertSaveHasBeenCalled(): void {
    expect(this.saveMock).toHaveBeenCalled();
  }

  assertSaveHasBeenCalledWith(expected: Plant): void {
    expect(this.saveMock).toHaveBeenCalledWith(expected);
  }

  assertSaveNotCalled(): void {
    expect(this.saveMock).not.toHaveBeenCalled();
  }

  assertUpdateHasBeenCalledWith(
    current: PlantPrimitives,
    updated: unknown,
    user: string
  ): void {
    expect(this.updateMock).toHaveBeenCalledWith(current, updated, user);
  }

  assertUpdateHasBeenCalled(): void {
    expect(this.updateMock).toHaveBeenCalled();
  }

  assertFindByIdHasBeenCalledWith(expected: string): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(expected);
  }

  assertFindAllHasBeenCalled(): void {
    expect(this.findAllMock).toHaveBeenCalled();
  }

  assertExistsHasBeenCalledWith(expected: string): void {
    expect(this.existsMock).toHaveBeenCalledWith(expected);
  }

  addToStorage(plant: Plant): void {
    this.storage.set(plant.id.value, plant);
  }

  clear(): void {
    this.storage.clear();
    jest.clearAllMocks();
  }

  simulateSaveFailure(): void {
    this.failOnSave = true;
  }
}
