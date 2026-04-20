import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import { PlantDtoMapper } from '../mappers/PlantDtoMapper.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export class UpdatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: UpdatePlantDto, user: string): Promise<void> {
    const plant = await this.plantRepository.findById(dto.id);

    if (!plant) {
      throw new Error(`Plant not found: ${dto.id}`);
    }

    const patch = PlantDtoMapper.toPatch(dto);

    await this.plantRepository.update(patch, user);
  }
}
