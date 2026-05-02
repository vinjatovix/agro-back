import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export class ListPlants {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(user: UserSessionInfo | null): Promise<Plant[]> {
    const plants = await this.plantRepository.findAll();
    const isAdmin = user?.roles.includes('admin');
    const filteredPlants = isAdmin
      ? plants
      : plants.filter((plant) => !plant.isDeleted());
    return filteredPlants;
  }
}
