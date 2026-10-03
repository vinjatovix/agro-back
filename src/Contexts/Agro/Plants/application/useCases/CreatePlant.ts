import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantInputMapper } from '../../mappers/plantInputMapper.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';

export type CreatePlantDependencies = {
  plantRepository: PlantRepository;
  familyRepository: FamilyRepository;
};

export class CreatePlant {
  private readonly plantRepository: PlantRepository;
  private readonly familyRepository: FamilyRepository;

  constructor({ plantRepository, familyRepository }: CreatePlantDependencies) {
    this.plantRepository = plantRepository;
    this.familyRepository = familyRepository;
  }

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

    const plant = plantInputMapper.fromCreateDto(dto, user);

    await this.plantRepository.save(plant);

    return plant;
  }
}
