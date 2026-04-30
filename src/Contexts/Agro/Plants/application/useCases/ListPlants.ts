import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';

export class ListPlants {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(user: UserSessionInfo | null): Promise<PlantPrimitives[]> {
    const plants = await this.plantRepository.findAll();
    const isAdmin = user?.roles.includes('admin');
    const filteredPlants = isAdmin
      ? plants
      : plants.filter((plant) => !plant.isDeleted());
    return filteredPlants.map((plant) => plantMapper.toPrimitives(plant));
  }
}
