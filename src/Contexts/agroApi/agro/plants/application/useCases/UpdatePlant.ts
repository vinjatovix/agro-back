import { applyPatch } from '../../../../../../shared/domain/patch/applyPatch.js';
import { createError } from '../../../../../../shared/errors/index.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export class UpdatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: UpdatePlantDto, user: string): Promise<void> {
    const plant = await this.plantRepository.findById(dto.id);

    if (!plant) {
      throw createError.notFound(`Plant not found: ${dto.id}`);
    }

    const current = plantMapper.toPrimitives(plant);
    const patch = plantMapper.fromUpdateDtoToPrimitivesPatch(dto);
    const patched = applyPatch(current, patch);

    await this.plantRepository.updateWithDiff(current, patched, user);
  }
}
