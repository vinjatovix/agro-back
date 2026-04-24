import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';
import type { Plant } from '../../domain/entities/Plant.js';
import { plantMapper } from '../../mappers/plantMapper.js';

export class CreatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw new Error(`Plant already exists: ${dto.id}`);
    }

    const plant = plantMapper.fromCreateDtoToDomain(dto, user);

    await this.plantRepository.save(plant);

    return plant;
  }
}
