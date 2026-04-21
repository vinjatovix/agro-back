import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import { PlantSowingPatch } from '../../domain/value-objects/PlantSowingPatch.js';

export class PlantSowingDtoMapper {
  static toPatch(dto: {
    seedsPerHole?: RangePrimitives;
    germinationDays?: RangePrimitives;
    months?: number[];
    methods?: {
      direct?: { depthCm: RangePrimitives };
      starter?: { depthCm: RangePrimitives };
    };
  }): PlantSowingPatch {
    const patch: ConstructorParameters<typeof PlantSowingPatch>[0] = {};

    if (dto.seedsPerHole !== undefined) {
      patch.seedsPerHole = new Range(
        dto.seedsPerHole.min,
        dto.seedsPerHole.max
      );
    }

    if (dto.germinationDays !== undefined) {
      patch.germinationDays = new Range(
        dto.germinationDays.min,
        dto.germinationDays.max
      );
    }

    if (dto.months !== undefined) {
      patch.months = new MonthSet(dto.months);
    }

    if (dto.methods !== undefined) {
      patch.methods = {};

      if (dto.methods.direct !== undefined) {
        patch.methods.direct = {};

        if (dto.methods.direct.depthCm !== undefined) {
          patch.methods.direct.depth = new Range(
            dto.methods.direct.depthCm.min,
            dto.methods.direct.depthCm.max
          );
        }
      }

      if (dto.methods.starter !== undefined) {
        patch.methods.starter = {};

        if (dto.methods.starter.depthCm !== undefined) {
          patch.methods.starter.depth = new Range(
            dto.methods.starter.depthCm.min,
            dto.methods.starter.depthCm.max
          );
        }
      }
    }

    return new PlantSowingPatch(patch);
  }
}
