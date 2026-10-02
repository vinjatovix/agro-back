import type { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import type { WriteOutcome } from '../../../../../src/Contexts/shared/domain/repositories/WriteOutcome.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { PlantFactory } from '../../Plants/domain/mothers/PlantFactory.js';

export class InMemoryPlantRepository implements PlantRepository {
  constructor(private readonly plants = new Map<string, Plant>()) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(plant: Plant): Promise<void> {
    this.plants.set(plant.id, plant);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: string): Promise<Nullable<Plant>> {
    return this.plants.get(id) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findActiveById(id: string): Promise<Nullable<Plant>> {
    const plant = this.plants.get(id);

    return plant && !plant.isDeleted() ? plant : null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(): Promise<PaginatedResult<Plant>> {
    const plantsArray = Array.from(this.plants.values());
    // A single page holding every plant.
    return {
      data: plantsArray,
      pagination: {
        page: 1,
        limit: plantsArray.length,
        totalPages: plantsArray.length > 0 ? 1 : 0,
        totalItems: plantsArray.length
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exists(id: string): Promise<boolean> {
    return this.plants.has(id);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateWithDiff(
    current: PlantPrimitives,
    updated: PlantPrimitives
  ): Promise<WriteOutcome> {
    const id = current.id;
    if (!this.plants.has(id)) {
      throw new DomainNotFoundException(`Plant not found: ${id}`);
    }

    this.plants.set(
      id,
      plantDomainMapper.fromPrimitives({
        ...updated,
        version: current.version + 1
      })
    );

    return 'written';
  }
}

export function createPlantCatalog() {
  const tomato = PlantFactory.tomato();
  const lettuce = PlantFactory.lettuce();

  const plantRepository = new InMemoryPlantRepository(
    new Map([
      [tomato.id, tomato],
      [lettuce.id, lettuce]
    ])
  );

  return {
    plantRepository,
    fixtures: { tomato, lettuce }
  };
}
