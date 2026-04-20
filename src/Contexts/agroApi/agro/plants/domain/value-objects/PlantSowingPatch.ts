import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';

export class PlantSowingPatch {
  readonly seedsPerHole?: Range;
  readonly germinationDays?: Range;
  readonly months?: MonthSet;

  readonly methods?: {
    direct?: {
      depth?: Range;
    };
    starter?: {
      depth?: Range;
    };
  };

  constructor(params: {
    seedsPerHole?: Range;
    germinationDays?: Range;
    months?: MonthSet;
    methods?: {
      direct?: { depth?: Range };
      starter?: { depth?: Range };
    };
  }) {
    if (params.seedsPerHole !== undefined) {
      this.seedsPerHole = params.seedsPerHole;
    }

    if (params.germinationDays !== undefined) {
      this.germinationDays = params.germinationDays;
    }

    if (params.months !== undefined) {
      this.months = params.months;
    }

    if (params.methods !== undefined) {
      this.methods = params.methods;
    }
  }

  toPrimitives() {
    return {
      ...(this.seedsPerHole !== undefined && {
        seedsPerHole: this.seedsPerHole.toPrimitives()
      }),

      ...(this.germinationDays !== undefined && {
        germinationDays: this.germinationDays.toPrimitives()
      }),

      ...(this.months !== undefined && {
        months: this.months.toArray()
      }),

      ...(this.methods !== undefined && {
        methods: {
          ...(this.methods.direct && {
            direct: {
              ...(this.methods.direct.depth && {
                depthCm: this.methods.direct.depth.toPrimitives()
              })
            }
          }),
          ...(this.methods.starter && {
            starter: {
              ...(this.methods.starter.depth && {
                depthCm: this.methods.starter.depth.toPrimitives()
              })
            }
          })
        }
      })
    };
  }
}
