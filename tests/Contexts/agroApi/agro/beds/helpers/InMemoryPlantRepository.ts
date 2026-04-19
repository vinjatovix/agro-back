import type { Plant } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import type { PlantRepository } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { PlantMother } from '../../plants/domain/mothers/PlantMother.js';
export class InMemoryPlantRepository implements PlantRepository {
  constructor(private catalog: Map<string, Plant>) {}

  findById(id: string): Plant {
    const plant = this.catalog.get(id);
    if (!plant) throw new Error('Plant not found');
    return plant;
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
