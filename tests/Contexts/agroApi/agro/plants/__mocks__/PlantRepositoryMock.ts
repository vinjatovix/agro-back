import { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantPatch } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/PlantPatch.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantLifecycicle.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';

export class PlantRepositoryMock implements PlantRepository {
  private readonly saveMock = jest.fn();
  private readonly updateMock = jest.fn();
  private readonly findByIdMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly existsMock = jest.fn();

  private storage: Map<string, Plant> = new Map();
  private failOnSave = false;

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(plant: Plant): Promise<void> {
    this.saveMock(plant);

    if (this.failOnSave) {
      throw new Error('Save failed');
    }

    this.storage.set(plant.id, plant);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(patch: PlantPatch, username: string): Promise<void> {
    this.updateMock(patch, username);

    if (this.failOnSave) {
      throw new Error('Update failed');
    }

    const id = patch.id.value;
    const existing = this.storage.get(id);

    if (!existing) {
      throw new Error(`Plant not found: ${id}`);
    }

    const existingPrimitives = existing.toPrimitives();
    const patchPrimitives = patch.toPrimitives();

    const updatedPrimitives: PlantPrimitives = {
      ...existingPrimitives,
      ...patchPrimitives,
      size: {
        height: patchPrimitives.size?.height ?? existingPrimitives.size.height,
        spread: patchPrimitives.size?.spread ?? existingPrimitives.size.spread
      }
    };

    const updatedPlant = Plant.create({
      id: updatedPrimitives.id,
      name: updatedPrimitives.name,
      ...(updatedPrimitives.scientificName && {
        scientificName: updatedPrimitives.scientificName
      }),
      familyId: updatedPrimitives.familyId,
      lifecycle: PlantLifecycle.from(updatedPrimitives.lifecycle),
      size: {
        height: new Range(
          updatedPrimitives.size.height.min,
          updatedPrimitives.size.height.max
        ),
        spread: new Range(
          updatedPrimitives.size.spread.min,
          updatedPrimitives.size.spread.max
        )
      },
      sowingMonths: new MonthSet(updatedPrimitives.sowingMonths),
      floweringMonths: new MonthSet(updatedPrimitives.floweringMonths),
      harvestMonths: new MonthSet(updatedPrimitives.harvestMonths),
      spacingCm: new Range(
        updatedPrimitives.spacingCm.min,
        updatedPrimitives.spacingCm.max
      ),
      metadata: Metadata.fromPrimitives({
        createdAt: existing.metadata.createdAt ?? new Date(),
        createdBy: existing.metadata.createdBy ?? 'unknown',
        updatedAt: new Date(),
        updatedBy: username
      })
    });

    this.storage.set(id, updatedPlant);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: string): Promise<Plant> {
    this.findByIdMock(id);

    const plant = this.storage.get(id);

    if (!plant) {
      throw new Error(`Plant not found: ${id}`);
    }

    return plant;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(): Promise<Plant[]> {
    this.findAllMock();
    return Array.from(this.storage.values());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exists(id: string): Promise<boolean> {
    this.existsMock(id);
    return this.storage.has(id);
  }

  assertSaveHasBeenCalled(): void {
    expect(this.saveMock).toHaveBeenCalled();
  }

  assertSaveHasBeenCalledWith(expected: Plant): void {
    expect(this.saveMock).toHaveBeenCalledWith(expected);
  }

  assertUpdateHasBeenCalled(): void {
    expect(this.updateMock).toHaveBeenCalled();
  }

  assertUpdateHasBeenCalledWith(
    expected: Plant,
    expectedUsername: string
  ): void {
    expect(this.updateMock).toHaveBeenCalledWith(expected, expectedUsername);
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
    this.storage.set(plant.id, plant);
  }

  clear(): void {
    this.storage.clear();
    jest.clearAllMocks();
  }

  simulateSaveFailure(): void {
    this.failOnSave = true;
  }
}
