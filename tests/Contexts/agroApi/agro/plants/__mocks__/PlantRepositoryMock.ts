import type { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';

export class PlantRepositoryMock implements PlantRepository {
  private readonly saveMock = jest.fn();
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

  // 🧪 ASSERTS

  assertSaveHasBeenCalled(): void {
    expect(this.saveMock).toHaveBeenCalled();
  }

  assertSaveHasBeenCalledWith(expected: Plant): void {
    expect(this.saveMock).toHaveBeenCalledWith(expected);
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

  // 🧪 HELPERS

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
