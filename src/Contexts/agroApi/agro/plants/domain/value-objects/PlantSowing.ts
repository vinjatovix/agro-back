import { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { PlantSowingPrimitives } from '../entities/types/PlantSowingPrimitives.js';
import type { PlantSowingPatch } from './PlantSowingPatch.js';

export interface SowingMethod {
  depth: Range;
}

export interface PlantSowingProps {
  seedsPerHole: Range;
  germinationDays: Range;
  months: MonthSet;
  methods: {
    direct: SowingMethod;
    starter?: SowingMethod;
  };
}

export class PlantSowing {
  readonly seedsPerHole: Range;
  readonly germinationDays: Range;
  readonly months: MonthSet;
  readonly methods: {
    direct: SowingMethod;
    starter?: SowingMethod;
  };

  constructor(props: PlantSowingProps) {
    this.seedsPerHole = props.seedsPerHole;
    this.germinationDays = props.germinationDays;
    this.months = props.months;
    this.methods = props.methods;
  }

  toPrimitives() {
    return {
      seedsPerHole: this.seedsPerHole.toPrimitives(),
      germinationDays: this.germinationDays.toPrimitives(),
      months: this.months.toArray(),

      methods: {
        direct: {
          depthCm: this.methods.direct.depth.toPrimitives()
        },

        ...(this.methods.starter && {
          starter: {
            depthCm: this.methods.starter.depth.toPrimitives()
          }
        })
      }
    };
  }

  static fromPrimitives(primitives: PlantSowingPrimitives): PlantSowing {
    return new PlantSowing({
      seedsPerHole: new Range(
        primitives.seedsPerHole.min,
        primitives.seedsPerHole.max
      ),

      germinationDays: new Range(
        primitives.germinationDays.min,
        primitives.germinationDays.max
      ),

      months: new MonthSet(primitives.months),

      methods: {
        direct: {
          depth: new Range(
            primitives.methods.direct.depthCm.min,
            primitives.methods.direct.depthCm.max
          )
        },

        ...(primitives.methods.starter && {
          starter: {
            depth: new Range(
              primitives.methods.starter.depthCm.min,
              primitives.methods.starter.depthCm.max
            )
          }
        })
      }
    });
  }

  apply(patch: PlantSowingPatch): PlantSowing {
    return new PlantSowing({
      seedsPerHole: patch.seedsPerHole ?? this.seedsPerHole,
      germinationDays: patch.germinationDays ?? this.germinationDays,
      months: patch.months ?? this.months,
      methods: this.buildMethods(patch)
    });
  }

  private buildMethods(patch: PlantSowingPatch): PlantSowingProps['methods'] {
    return {
      direct: {
        depth: patch.methods?.direct?.depth ?? this.methods.direct.depth
      },

      ...(patch.methods?.starter || this.methods.starter
        ? {
            starter: {
              depth:
                patch.methods?.starter?.depth ??
                this.methods.starter?.depth ??
                this.methods.direct.depth
            }
          }
        : {})
    };
  }
}
