import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import { AggregateRoot } from '../../../../../shared/domain/AggregateRoot.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';

export interface PlantProps {
  id: string;
  name: string;
  scientificName?: string;
  familyId?: string;

  lifecycle: 'annual' | 'biennial' | 'perennial';

  size: {
    height: Range;
    spread: Range;
  };

  sowingMonths: MonthSet;
  floweringMonths: MonthSet;
  harvestMonths: MonthSet;

  spacingCm: Range;

  metadata?: Metadata;
}

export class Plant extends AggregateRoot {
  private props: PlantProps;

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

  get size() {
    return this.props.size;
  }

  get sowingMonths(): MonthSet {
    return this.props.sowingMonths;
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

  toPrimitives(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      scientificName: this.props.scientificName,
      familyId: this.props.familyId,
      lifecycle: this.props.lifecycle,
      size: {
        height: this.props.size.height,
        spread: this.props.size.spread
      },
      sowingMonths: this.props.sowingMonths,
      floweringMonths: this.props.floweringMonths,
      harvestMonths: this.props.harvestMonths,
      spacingCm: this.props.spacingCm,
      metadata: this.props.metadata ? this.props.metadata : undefined
    };
  }
}
