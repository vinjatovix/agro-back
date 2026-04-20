import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import { AggregateRoot } from '../../../../../shared/domain/AggregateRoot.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PlantLifecycle } from '../value-objects/PlantLifecycicle.js';
import type { PlantSowing } from '../value-objects/PlantSowing.js';
import type { CreatePlantProps } from './types/CreatePlantProps.js';
import type { PlantPrimitives } from './types/PlantPrimitives.js';

export interface PlantProps {
  id: string;
  name: string;
  scientificName?: string;
  familyId: string;

  lifecycle: PlantLifecycle;

  size: {
    height: Range;
    spread: Range;
  };

  sowing: PlantSowing;
  floweringMonths: MonthSet;
  harvestMonths: MonthSet;

  spacingCm: Range;

  metadata: Metadata;
}

export class Plant extends AggregateRoot<PlantPrimitives> {
  private readonly props: PlantProps;

  constructor(props: PlantProps) {
    super();
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get lifecycle(): PlantLifecycle {
    return this.props.lifecycle;
  }

  get size() {
    return this.props.size;
  }

  get sowing(): PlantSowing {
    return this.props.sowing;
  }

  get floweringMonths(): MonthSet {
    return this.props.floweringMonths;
  }

  get harvestMonths(): MonthSet {
    return this.props.harvestMonths;
  }

  get spacing(): Range {
    return this.props.spacingCm;
  }

  get scientificName(): string | undefined {
    return this.props.scientificName;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  toPrimitives(): PlantPrimitives {
    const primitives: PlantPrimitives = {
      id: this.props.id,
      name: this.props.name,
      familyId: this.props.familyId,
      lifecycle: this.props.lifecycle.getValue(),

      size: {
        height: this.props.size.height.toPrimitives(),
        spread: this.props.size.spread.toPrimitives()
      },

      sowing: this.props.sowing.toPrimitives(),
      floweringMonths: this.props.floweringMonths.toArray(),
      harvestMonths: this.props.harvestMonths.toArray(),

      spacingCm: this.props.spacingCm.toPrimitives()
    };

    if (this.props.scientificName) {
      primitives.scientificName = this.props.scientificName;
    }

    if (this.props.metadata) {
      primitives.metadata = this.props.metadata.toPrimitives();
    }

    return primitives;
  }

  static create(props: CreatePlantProps): Plant {
    return new Plant({
      ...props
    });
  }
}
