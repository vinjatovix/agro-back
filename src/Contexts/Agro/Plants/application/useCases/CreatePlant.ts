import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';
import type { Plant } from '../../domain/entities/Plant.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import { plantApiMapper } from '../../mappers/plantApiMapper.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';

export class CreatePlant {
  constructor(
    private readonly plantRepository: PlantRepository,
    private readonly familyRepository: FamilyRepository
  ) {}

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Plant already exists: ${dto.id}`);
    }
    const familyExists = await this.familyRepository.exists(
      dto.identity.family
    );

    if (!familyExists) {
      throw new InvalidArgumentException(
        `Family with id ${dto.identity.family} does not exist`
      );
    }

    const plant = plantApiMapper.fromCreateDto(dto, user);

    await this.plantRepository.save(plant);

    return plant;
  }
}
