import {
  MonthSet,
  Range
} from '../../../../../../shared/domain/value-objects/index.js';
import { AggregateRoot } from '../../../../../shared/domain/AggregateRoot.js';
import type { Serializable } from '../../../../../shared/domain/interfaces/index.js';
import {
  Metadata,
  Uuid
} from '../../../../../shared/domain/valueObject/index.js';
import { PlantLifecycle, PlantSowing } from '../value-objects/index.js';
import type { PlantProps } from './types/PlantProps.js';
import {
  PlantStatus,
  type CreatePlantProps,
  type PlantPrimitives
} from './types/index.js';

export class Plant
  extends AggregateRoot<Uuid>
  implements Serializable<PlantPrimitives>
{
  private readonly props: PlantProps;
  private status: PlantStatus;
  private deletedAt: Date | undefined;

  constructor(props: PlantProps) {
    super(props.id);
    this.props = props;
    this.status = props.status ?? PlantStatus.ACTIVE;
    this.deletedAt = props.deletedAt;
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

  isDeleted(): boolean {
    return this.status === PlantStatus.DELETED;
  }

  markAsDeleted(): void {
    if (this.isDeleted()) return;

    this.status = PlantStatus.DELETED;
    this.deletedAt = new Date();
  }

  toPrimitives(): PlantPrimitives {
    const primitives: PlantPrimitives = {
      id: this.id.value,
      status: this.status,
      deletedAt: this.deletedAt?.toISOString() ?? null,
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

      spacingCm: this.props.spacingCm.toPrimitives(),
      metadata: this.props.metadata.toPrimitives()
    };

    if (this.props.scientificName !== undefined) {
      primitives.scientificName = this.props.scientificName;
    }

    return primitives;
  }

  static create(props: CreatePlantProps): Plant {
    return new Plant({
      ...props
    });
  }

  static fromPrimitives(primitives: PlantPrimitives): Plant {
    const props: PlantProps = {
      id: new Uuid(primitives.id),
      name: primitives.name,
      familyId: primitives.familyId,
      lifecycle: PlantLifecycle.from(primitives.lifecycle),

      size: {
        height: Range.fromPrimitives(primitives.size.height),
        spread: Range.fromPrimitives(primitives.size.spread)
      },

      sowing: PlantSowing.fromPrimitives(primitives.sowing),
      floweringMonths: MonthSet.fromArray(primitives.floweringMonths),
      harvestMonths: MonthSet.fromArray(primitives.harvestMonths),
      spacingCm: Range.fromPrimitives(primitives.spacingCm),
      metadata: Metadata.fromPrimitives(primitives.metadata)
    };

    if (
      primitives.scientificName !== undefined &&
      primitives.scientificName !== null
    ) {
      props.scientificName = primitives.scientificName;
    }

    if (primitives.deletedAt) {
      props.deletedAt = new Date(primitives.deletedAt);
    }

    return new Plant(props);
  }
}
