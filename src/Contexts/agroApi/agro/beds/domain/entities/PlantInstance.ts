import type { Coordinates } from '../../../../../../shared/domain/value-objects/Coordinates.js';
import type { PlantInstanceStatus } from './PlantInstanceStatus.js';

export interface PlantInstanceProps {
  id: string;
  userId: string;
  plantId: string;

  position: Coordinates;

  status: PlantInstanceStatus;

  plantedAt: Date;
  removedAt?: Date;

  variety?: string;

  notes?: string;
}

export class PlantInstance {
  constructor(private props: PlantInstanceProps) {}

  get id() {
    return this.props.id;
  }

  get position() {
    return this.props.position;
  }

  get plantId() {
    return this.props.plantId;
  }

  get status() {
    return this.props.status;
  }
}
