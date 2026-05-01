import type { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantMapper.js';
import { PlantFactory } from '../../Plants/domain/mothers/PlantFactory.js';

export class InMemoryPlantRepository implements PlantRepository {
  constructor(private readonly plants = new Map<string, Plant>()) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(plant: Plant): Promise<void> {
    this.plants.set(plant.id.value, plant);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: string): Promise<Plant> {
    const plant = this.plants.get(id);
    if (!plant) throw new Error('Plant not found');
    return plant;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(): Promise<Plant[]> {
    return Array.from(this.plants.values());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exists(id: string): Promise<boolean> {
    return this.plants.has(id);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateWithDiff(
    _current: PlantPrimitives,
    updated: PlantPrimitives,
    _username: string
  ): Promise<void> {
    const id = _current.id;
    if (!this.plants.has(id)) {
      throw new Error(`Plant not found: ${id}`);
    }

    const updatedPlant = plantMapper.fromPrimitives(updated);

    this.plants.set(id, updatedPlant);
  }
}

export function createPlantCatalog() {
  const tomato = PlantFactory.tomato();
  const lettuce = PlantFactory.lettuce();

  const plantRepository = new InMemoryPlantRepository(
    new Map([
      [tomato.id.value, tomato],
      [lettuce.id.value, lettuce]
    ])
  );

  return {
    plantRepository,
    fixtures: { tomato, lettuce }
  };
}
