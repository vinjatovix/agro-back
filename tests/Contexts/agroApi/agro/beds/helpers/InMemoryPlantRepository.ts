import type { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { PlantMother } from '../../plants/domain/mothers/PlantMother.js';
export class InMemoryPlantRepository implements PlantRepository {
  constructor(private plants = new Map<string, Plant>()) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(plant: Plant): Promise<void> {
    this.plants.set(plant.id, plant);
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
}

export function createPlantCatalog() {
  const catalog = new Map<string, Plant>([
    ['tomato', PlantMother.tomato()],
    ['lettuce', PlantMother.lettuce()]
  ]);

  const plantRepository = new InMemoryPlantRepository(catalog);

  return { catalog, plantRepository };
}
