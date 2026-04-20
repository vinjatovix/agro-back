/* eslint-disable @typescript-eslint/require-await */
import { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantPatch } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/PlantPatch.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantLifecycicle.js';
import { PlantSowing } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantSowing.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';

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

    this.storage.set(plant.id, plant);
  }

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

    const size = {
      height: patchPrimitives.size?.height ?? existingPrimitives.size.height,
      spread: patchPrimitives.size?.spread ?? existingPrimitives.size.spread
    };

    const sowing = {
      seedsPerHole:
        patchPrimitives.sowing?.seedsPerHole ??
        existingPrimitives.sowing.seedsPerHole,

      germinationDays:
        patchPrimitives.sowing?.germinationDays ??
        existingPrimitives.sowing.germinationDays,

      months:
        patchPrimitives.sowing?.months ?? existingPrimitives.sowing.months,

      methods: {
        direct: {
          depthCm:
            patchPrimitives.sowing?.methods?.direct?.depthCm ??
            existingPrimitives.sowing.methods.direct.depthCm
        },
        starter: patchPrimitives.sowing?.methods?.starter
          ? {
              depthCm: patchPrimitives.sowing.methods.starter.depthCm
            }
          : existingPrimitives.sowing.methods.starter
      }
    };

    const updatedPrimitives: PlantPrimitives = {
      ...existingPrimitives,
      ...patchPrimitives,
      size,
      sowing
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

      sowing: PlantSowing.fromPrimitives(updatedPrimitives.sowing),

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
    expectedPatch: PlantPatch,
    expectedUsername: string
  ): void {
    expect(this.updateMock).toHaveBeenCalledWith(
      expectedPatch,
      expectedUsername
    );
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
