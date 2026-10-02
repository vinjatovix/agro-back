import type { PlantPhenologyChanges } from '../entities/types/PlantPhenologyChanges.js';
import type { PlantPrimitives } from '../entities/types/PlantPrimitives.js';
import { PlantFlowering } from './PlantFlowering.js';
import { PlantHarvest } from './PlantHarvest.js';
import { PlantSowing } from './PlantSowing.js';

export type PlantPhenologyPrimitives = PlantPrimitives['phenology'];

export type PlantPhenologyProps = {
  sowing: PlantSowing;
  flowering: PlantFlowering;
  harvest: PlantHarvest;
};

/**
 * A plant's yearly cycle. Every plant is sown; flowering and harvest may have
 * no months, for plants that never flower or are not harvested.
 */
export class PlantPhenology {
  readonly sowing: PlantSowing;
  readonly flowering: PlantFlowering;
  readonly harvest: PlantHarvest;

  constructor(props: PlantPhenologyProps) {
    this.sowing = props.sowing;
    this.flowering = props.flowering;
    this.harvest = props.harvest;
  }

  update(changes: PlantPhenologyChanges): PlantPhenology {
    return new PlantPhenology({
      sowing: changes.sowing ? this.sowing.update(changes.sowing) : this.sowing,
      flowering: changes.flowering
        ? this.flowering.update(changes.flowering)
        : this.flowering,
      harvest: changes.harvest
        ? this.harvest.update(changes.harvest)
        : this.harvest
    });
  }

  toPrimitives(): PlantPhenologyPrimitives {
    return {
      sowing: this.sowing.toPrimitives(),
      flowering: this.flowering.toPrimitives(),
      harvest: this.harvest.toPrimitives()
    };
  }

  static fromPrimitives(primitives: PlantPhenologyPrimitives): PlantPhenology {
    return new PlantPhenology({
      sowing: PlantSowing.fromPrimitives(primitives.sowing),
      flowering: PlantFlowering.fromPrimitives(primitives.flowering),
      harvest: PlantHarvest.fromPrimitives(primitives.harvest)
    });
  }
}
