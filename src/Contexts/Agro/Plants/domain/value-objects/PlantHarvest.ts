import { patchField } from '../../../../../shared/domain/utils/patchField.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { MonthSet } from '../../../../../shared/domain/value-objects/MonthSet.js';
import type { PlantHarvestChanges } from '../entities/types/PlantPhenologyChanges.js';
import type { PlantPrimitives } from '../entities/types/PlantPrimitives.js';

export type PlantHarvestPrimitives = PlantPrimitives['phenology']['harvest'];

export type PlantHarvestProps = {
  months: MonthSet;
  description?: string;
};

/** When a plant is harvested. No months: it is not harvested. */
export class PlantHarvest {
  readonly months: MonthSet;
  readonly description?: string;

  constructor(props: PlantHarvestProps) {
    this.months = props.months;
    // Optional, but never blank when given.
    if (props.description !== undefined) {
      this.description = requiredText(
        props.description,
        'phenology.harvest.description'
      );
    }
  }

  static never(): PlantHarvest {
    return new PlantHarvest({ months: MonthSet.empty() });
  }

  /** An absent field is kept; `null` removes the description. */
  update(changes: PlantHarvestChanges): PlantHarvest {
    const months = changes.months
      ? MonthSet.fromArray(changes.months)
      : this.months;
    const description = patchField(changes.description, this.description);

    return new PlantHarvest({
      months,
      ...(description !== undefined && { description })
    });
  }

  toPrimitives(): PlantHarvestPrimitives {
    return {
      months: this.months.toArray(),
      ...(this.description !== undefined && { description: this.description })
    };
  }

  static fromPrimitives(primitives: PlantHarvestPrimitives): PlantHarvest {
    return new PlantHarvest({
      months: MonthSet.fromArray(primitives.months),
      ...(primitives.description !== undefined && {
        description: primitives.description
      })
    });
  }
}
