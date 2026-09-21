import { Coordinates } from '../../../../../shared/domain/value-objects/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../../shared/domain/interfaces/Serializable.js';
import { createPlantId, type PlantId } from '../../../Plants/domain/PlantId.js';
import {
  createPlantInstanceId,
  type PlantInstanceId
} from '../PlantInstanceId.js';
import {
  type CropGrowthStatus,
  PlantInstanceLifecycleStatus,
  type PlantInstancePrimitives,
  type PlantInstanceProps
} from './types/index.js';

export class PlantInstance implements Serializable<PlantInstancePrimitives> {
  constructor(private readonly props: PlantInstanceProps) {
    this.assertInvariants(props);
  }

  get id(): PlantInstanceId {
    return this.props.id;
  }

  get position(): Coordinates {
    return this.props.position;
  }

  get plantId(): PlantId {
    return this.props.plantId;
  }

  get growthStatus(): CropGrowthStatus {
    return this.props.growthStatus;
  }

  get instanceStatus(): PlantInstanceLifecycleStatus {
    return this.props.instanceStatus;
  }

  toPrimitives(): PlantInstancePrimitives {
    const result: PlantInstancePrimitives = {
      id: this.props.id,
      userId: this.props.userId,
      plantId: this.props.plantId,
      position: this.props.position.toPrimitives(),
      growthStatus: this.props.growthStatus,
      instanceStatus: this.props.instanceStatus,
      plantedAt: this.props.plantedAt.toISOString()
    };

    if (this.props.removedAt !== undefined) {
      result.removedAt = this.props.removedAt.toISOString();
    }

    if (this.props.variety !== undefined) {
      result.variety = this.props.variety;
    }

    if (this.props.notes !== undefined) {
      result.notes = this.props.notes;
    }

    return result;
  }

  static fromPrimitives(p: PlantInstancePrimitives): PlantInstance {
    return new PlantInstance({
      id: createPlantInstanceId(p.id),
      userId: createUserId(p.userId),
      plantId: createPlantId(p.plantId),
      position: Coordinates.fromPrimitives(p.position),
      growthStatus: p.growthStatus,
      instanceStatus: p.instanceStatus,
      plantedAt: new Date(p.plantedAt),
      ...(p.removedAt && { removedAt: new Date(p.removedAt) }),
      ...(p.variety !== undefined && { variety: p.variety }),
      ...(p.notes !== undefined && { notes: p.notes })
    });
  }

  private assertInvariants(props: PlantInstanceProps): void {
    if (
      props.removedAt &&
      props.instanceStatus !== PlantInstanceLifecycleStatus.REMOVED
    ) {
      throw new InvalidArgumentException(
        'Invalid PlantInstance: removedAt only allowed when instanceStatus is REMOVED'
      );
    }
  }
}
