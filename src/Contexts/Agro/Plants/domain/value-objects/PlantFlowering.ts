import { mergePatchField } from '../../../../../shared/domain/utils/patchField.js';
import { MonthSet } from '../../../../../shared/domain/value-objects/MonthSet.js';
import type { PlantFloweringChanges } from '../entities/types/PlantPhenologyChanges.js';
import type { PlantPrimitives } from '../entities/types/PlantPrimitives.js';
import { Pollination } from './Pollination.js';

export type PlantFloweringPrimitives =
  PlantPrimitives['phenology']['flowering'];

export type PlantFloweringProps = {
  months: MonthSet;
  pollination?: Pollination;
};

/**
 * When a plant flowers and how it is pollinated. No months: it does not flower
 * in a yearly cycle, though its pollination may still be known (bamboos flower
 * once every few decades).
 */
export class PlantFlowering {
  readonly months: MonthSet;
  readonly pollination?: Pollination;

  constructor(props: PlantFloweringProps) {
    this.months = props.months;
    if (props.pollination !== undefined) this.pollination = props.pollination;
  }

  static never(): PlantFlowering {
    return new PlantFlowering({ months: MonthSet.empty() });
  }

  /** An absent field is kept; `null` removes the pollination or its agents. */
  update(changes: PlantFloweringChanges): PlantFlowering {
    const months = changes.months
      ? MonthSet.fromArray(changes.months)
      : this.months;
    const pollination = mergePatchField(
      changes.pollination,
      this.pollination,
      (change, current) => current?.update(change) ?? Pollination.start(change)
    );

    return new PlantFlowering({
      months,
      ...(pollination !== undefined && { pollination })
    });
  }

  toPrimitives(): PlantFloweringPrimitives {
    return {
      months: this.months.toArray(),
      ...(this.pollination !== undefined && {
        pollination: this.pollination.toPrimitives()
      })
    };
  }

  static fromPrimitives(primitives: PlantFloweringPrimitives): PlantFlowering {
    const { pollination } = primitives;
    return new PlantFlowering({
      months: MonthSet.fromArray(primitives.months),
      ...(pollination !== undefined && {
        pollination: Pollination.fromPrimitives(pollination)
      })
    });
  }
}
