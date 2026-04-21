import type { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantPatch } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/PlantPatch.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { PlantMother } from '../../plants/domain/mothers/PlantMother.js';

export class InMemoryPlantRepository implements PlantRepository {
  constructor(private readonly plants = new Map<string, Plant>()) {}
  update(_plant: PlantPatch, _username: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

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
}

export function createPlantCatalog() {
  const tomato = PlantMother.tomato();
  const lettuce = PlantMother.lettuce();

  const catalog = new Map<string, Plant>([
    [tomato.id.value, tomato],
    [lettuce.id.value, lettuce]
  ]);

  const plantRepository = new InMemoryPlantRepository(catalog);

  return { catalog, plantRepository, fixtures: { tomato, lettuce } };
}
