import { MonthSet } from '../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { PlantSowingPrimitives } from '../entities/types/PlantSowingPrimitives.js';
import type { PlantSowingProps } from './interfaces/PlantSowingProps.js';
import type { SowingMethod } from './interfaces/SowingMethod.js';

export class PlantSowing {
  readonly seedsPerHole: Range;
  readonly germinationDays: Range;
  readonly months: MonthSet;
  readonly methods: {
    direct: SowingMethod;
    starter?: SowingMethod;
  };

  constructor(props: PlantSowingProps) {
    this.validate(props);
    this.seedsPerHole = props.seedsPerHole;
    this.germinationDays = props.germinationDays;
    this.months = props.months;
    this.methods = props.methods;
  }

  private validate(props: PlantSowingProps) {
    if (!props.methods?.direct?.depthCm) {
      throw createError.badRequest('PlantSowing.direct.depthCm is required');
    }
    if (props.methods.starter && !props.methods.starter.depthCm) {
      throw createError.badRequest('PlantSowing.starter.depthCm is required');
    }

    if (props.months.isEmpty()) {
      throw createError.badRequest(
        'PlantSowing.months must have at least one month'
      );
    }
    if (props.seedsPerHole.min <= 0 || props.seedsPerHole.max <= 0) {
      throw createError.badRequest(
        'PlantSowing.seedsPerHole must be greater than 0'
      );
    }
    if (props.germinationDays.min <= 0 || props.germinationDays.max <= 0) {
      throw createError.badRequest(
        'PlantSowing.germinationDays must be greater than 0'
      );
    }
  }

  toPrimitives() {
    return {
      seedsPerHole: this.seedsPerHole.toPrimitives(),
      germinationDays: this.germinationDays.toPrimitives(),
      months: this.months.toArray(),

      methods: {
        direct: {
          depthCm: this.methods.direct.depthCm.toPrimitives()
        },

        ...(this.methods.starter && {
          starter: {
            depthCm: this.methods.starter.depthCm.toPrimitives()
          }
        })
      }
    };
  }

  static fromPrimitives(p: PlantSowingPrimitives): PlantSowing {
    if (!p.methods?.direct?.depthCm) {
      throw createError.badRequest('PlantSowing.direct.depthCm is required');
    }
    if (p.methods.starter && !p.methods.starter.depthCm) {
      throw createError.badRequest('PlantSowing.starter.depthCm is required');
    }

    const { direct, starter } = p.methods;

    return new PlantSowing({
      seedsPerHole: Range.fromPrimitives(p.seedsPerHole),
      germinationDays: Range.fromPrimitives(p.germinationDays),
      months: MonthSet.fromArray(p.months),
      methods: {
        direct: {
          depthCm: Range.fromPrimitives(direct.depthCm)
        },
        ...(starter && {
          starter: {
            depthCm: Range.fromPrimitives(starter.depthCm)
          }
        })
      }
    });
  }
}
