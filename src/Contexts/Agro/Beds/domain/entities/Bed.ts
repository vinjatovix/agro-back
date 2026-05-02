import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import type { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import { BasicSpatialService } from '../services/index.js';
import type {
  SpatialPlantModel,
  SpatialService
} from '../services/spatial/interfaces/index.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { createError } from '../../../../../shared/errors/index.js';
import type { PositiveNumber } from '../../../../shared/domain/valueObject/PositiveNumber.js';
import type { StringValueObject } from '../../../../shared/domain/valueObject/StringValueObject.js';

export type BedProps = {
  id: Uuid;
  userId: Uuid;
  name: StringValueObject;
  width: PositiveNumber;
  height: PositiveNumber;
  depth: PositiveNumber;
  plantInstances?: PlantInstance[];
  metadata: Metadata;
  deleted: boolean;
  deletedAt?: Date;
};

export class Bed extends AggregateRoot<Uuid> {
  private readonly props: BedProps & { plantInstances: PlantInstance[] };

  constructor(
    props: BedProps,
    private readonly spatialService: SpatialService = new BasicSpatialService()
  ) {
    super(props.id);

    this.props = {
      ...props,
      plantInstances: props.plantInstances ?? []
    };
  }

  get name(): StringValueObject {
    return this.props.name;
  }

  get width(): PositiveNumber {
    return this.props.width;
  }

  get height(): PositiveNumber {
    return this.props.height;
  }

  get depth(): PositiveNumber {
    return this.props.depth;
  }

  get plantInstances(): readonly PlantInstance[] {
    return [...this.props.plantInstances];
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get isDeleted(): boolean {
    return this.props.deleted;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get userId(): Uuid {
    return this.props.userId;
  }

  addPlant(
    plant: PlantInstance,
    newPlantSpatial: SpatialPlantModel,
    existingSpatialPlants: SpatialPlantModel[]
  ): void {
    if (this.isDeleted) {
      throw createError.badRequest('Cannot add a plant to a deleted bed');
    }
    this.spatialService.validatePlacement(
      {
        width: this.props.width,
        height: this.props.height,
        plants: existingSpatialPlants
      },
      newPlantSpatial
    );

    this.props.plantInstances.push(plant);
  }

  removePlant(plantId: Uuid): void {
    const index = this.props.plantInstances.findIndex((p) =>
      p.id.equals(plantId)
    );

    if (index === -1) return;

    this.props.plantInstances.splice(index, 1);
  }

  static create(props: BedProps): Bed {
    return new Bed({
      ...props,
      plantInstances: props.plantInstances ?? []
    });
  }

  markAsDeleted(): void {
    if (this.plantInstances.length > 0) {
      throw createError.badRequest('Cannot delete a bed that has plants');
    }
    if (this.isDeleted) {
      throw createError.badRequest('Bed is already deleted');
    }
    this.props.deleted = true;
    this.props.deletedAt = new Date();
  }
}
