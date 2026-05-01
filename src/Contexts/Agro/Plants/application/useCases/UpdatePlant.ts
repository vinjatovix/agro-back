import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export class UpdatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: UpdatePlantDto, user: string): Promise<PlantPrimitives> {
    const plant = await this.plantRepository.findById(dto.id);

    if (!plant) {
      throw createError.notFound(`Plant not found: ${dto.id}`);
    }

    const current = plantMapper.toPrimitives(plant);
    const patch = plantMapper.fromUpdateDtoToPrimitivesPatch(dto);
    const patched = applyPatch(current, patch);
    plantMapper.fromCreateDtoToDomain(patched);

    await this.plantRepository.updateWithDiff(current, patched, user);

    const updatedPlant = await this.plantRepository.findById(dto.id);

    const result = plantMapper.toPrimitives(updatedPlant);

    return result;
  }
}
