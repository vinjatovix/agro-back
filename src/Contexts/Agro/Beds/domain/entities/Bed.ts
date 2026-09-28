import type { UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../shared/domain/valueObject/PositiveNumber.js';
import { StringValueObject } from '../../../../shared/domain/valueObject/StringValueObject.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { PlantInstanceId } from '../../../PlantInstances/domain/PlantInstanceId.js';
import type { BedId } from '../BedId.js';
import { BasicSpatialService } from '../services/index.js';
import type {
  SpatialPlantModel,
  SpatialService
} from '../services/spatial/interfaces/index.js';
import type { BedDimensionsChanges } from './types/BedDimensionsChanges.js';
import type { BedProps } from './types/BedProps.js';

export class Bed extends AggregateRoot<BedId> {
  private readonly props: BedProps & {
    plantInstances: PlantInstance[];
    version: number;
  };

  constructor(
    props: BedProps,
    private readonly spatialService: SpatialService = new BasicSpatialService()
  ) {
    super(props.id);

    this.props = {
      ...props,
      plantInstances: props.plantInstances ?? [],
      version: props.version ?? 0
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
    return this.props.plantInstances;
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

  get userId(): UserId {
    return this.props.userId;
  }

  get version(): number {
    return this.props.version;
  }

  addPlant(
    plant: PlantInstance,
    newPlantSpatial: SpatialPlantModel,
    existingSpatialPlants: SpatialPlantModel[]
  ): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Cannot add a plant to a deleted bed');
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

  removePlant(plantId: PlantInstanceId): void {
    const index = this.props.plantInstances.findIndex((p) => p.id === plantId);

    if (index === -1) return;

    this.props.plantInstances.splice(index, 1);
  }

  rename(name: string): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Cannot rename a deleted bed');
    }
    this.props.name = new StringValueObject(name);
  }

  resize(changes: BedDimensionsChanges): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Cannot resize a deleted bed');
    }

    const width =
      changes.width !== undefined
        ? this.buildDimension(changes.width, 'width')
        : this.props.width;
    const height =
      changes.height !== undefined
        ? this.buildDimension(changes.height, 'height')
        : this.props.height;
    const depth =
      changes.depth !== undefined
        ? this.buildDimension(changes.depth, 'depth')
        : this.props.depth;

    this.props.width = width;
    this.props.height = height;
    this.props.depth = depth;
  }

  private buildDimension(value: number, field: string): PositiveNumber {
    try {
      return PositiveNumber.create(value);
    } catch {
      throw new InvalidArgumentException(
        `Bed.${field} must be a positive number`
      );
    }
  }

  static create(props: BedProps): Bed {
    return new Bed({
      ...props,
      plantInstances: props.plantInstances ?? []
    });
  }

  markAsDeleted(): void {
    if (this.plantInstances.length > 0) {
      throw new DomainConflictException(
        'Cannot delete bed with plants. Remove plants or transplant them first.'
      );
    }
    if (this.isDeleted) {
      throw new DomainConflictException('Bed is already deleted');
    }
    this.props.deleted = true;
    this.props.deletedAt = new Date();
  }
}
