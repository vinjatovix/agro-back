import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';
import type { Plant } from '../../domain/entities/Plant.js';
import { plantMapper } from '../../mappers/plantMapper.js';
import { createError } from '../../../../../shared/errors/index.js';

export class CreatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw createError.conflict(`Plant already exists: ${dto.id}`);
    }

    const plant = plantMapper.fromCreateDtoToDomain(dto, user);

    await this.plantRepository.save(plant);

    return plant;
  }
}
