import { Plant } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { PlantMother } from '../../../../plants/domain/mothers/PlantMother.js';

export function createPlantCatalog() {
  const catalog: Record<string, Plant> = {
    tomato: PlantMother.tomato(),
    lettuce: PlantMother.lettuce()
  };

  const getPlant = (id: string): Plant => {
    const plant = catalog[id];
    if (!plant) throw new Error(`Plant not found: ${id}`);
    return plant;
  };

  return { catalog, getPlant };
}
