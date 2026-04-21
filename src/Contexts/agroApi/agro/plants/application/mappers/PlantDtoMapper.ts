import type { PlantPatch } from '../../domain/entities/PlantPatch.js';
import type { UpdatePlantDto } from '../useCases/interfaces/UpdatePlantDto.js';

export class PlantDtoMapper {
  static toPatch(dto: UpdatePlantDto): PlantPatch {
    const patch: PlantPatch = {
      id: dto.id
    };

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.familyId !== undefined) patch.familyId = dto.familyId;
    if (dto.lifecycle !== undefined) patch.lifecycle = dto.lifecycle;

    if (dto.size !== undefined) {
      patch.size = {};

      if (dto.size.height !== undefined) {
        patch.size.height = dto.size.height;
      }

      if (dto.size.spread !== undefined) {
        patch.size.spread = dto.size.spread;
      }
    }

    if (dto.spacingCm !== undefined) {
      patch.spacingCm = dto.spacingCm;
    }

    if (dto.sowing !== undefined) {
      patch.sowing = dto.sowing;
    }

    if (dto.floweringMonths !== undefined) {
      patch.floweringMonths = dto.floweringMonths;
    }

    if (dto.harvestMonths !== undefined) {
      patch.harvestMonths = dto.harvestMonths;
    }

    if (dto.scientificName !== undefined) {
      patch.scientificName = dto.scientificName;
    }

    return patch;
  }
}
