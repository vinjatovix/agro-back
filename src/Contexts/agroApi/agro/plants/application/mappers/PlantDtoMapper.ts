import { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import { PlantPatch } from '../../domain/entities/PlantPatch.js';
import { PlantLifecycle } from '../../domain/value-objects/PlantLifecycle.js';
import type { PlantSowingPatch } from '../../domain/value-objects/PlantSowingPatch.js';
import type { UpdatePlantDto } from '../useCases/interfaces/UpdatePlantDto.js';
import { PlantSowingDtoMapper } from './PlantSowingDtoMapper.js';

export class PlantDtoMapper {
  static toPatch(dto: UpdatePlantDto): PlantPatch {
    const patch: {
      id: Uuid;
      name?: string;
      familyId?: string;
      lifecycle?: PlantLifecycle;
      size?: {
        height?: Range;
        spread?: Range;
      };
      spacingCm?: Range;
      sowing?: PlantSowingPatch;
      floweringMonths?: MonthSet;
      harvestMonths?: MonthSet;
      scientificName?: string;
    } = {
      id: new Uuid(dto.id)
    };

    if (dto.name !== undefined) {
      patch.name = dto.name;
    }

    if (dto.familyId !== undefined) {
      patch.familyId = dto.familyId;
    }

    if (dto.lifecycle !== undefined) {
      patch.lifecycle = PlantLifecycle.from(dto.lifecycle);
    }

    if (dto.size !== undefined) {
      patch.size = {};

      if (dto.size.height !== undefined) {
        patch.size.height = new Range(dto.size.height.min, dto.size.height.max);
      }

      if (dto.size.spread !== undefined) {
        patch.size.spread = new Range(dto.size.spread.min, dto.size.spread.max);
      }
    }

    if (dto.spacingCm !== undefined) {
      patch.spacingCm = new Range(dto.spacingCm.min, dto.spacingCm.max);
    }

    if (dto.sowing !== undefined) {
      patch.sowing = PlantSowingDtoMapper.toPatch(dto.sowing);
    }

    if (dto.floweringMonths !== undefined) {
      patch.floweringMonths = new MonthSet(dto.floweringMonths);
    }

    if (dto.harvestMonths !== undefined) {
      patch.harvestMonths = new MonthSet(dto.harvestMonths);
    }

    if (dto.scientificName !== undefined) {
      patch.scientificName = dto.scientificName;
    }

    return new PlantPatch(patch);
  }
}
