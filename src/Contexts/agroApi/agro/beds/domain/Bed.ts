import { AggregateRoot } from '../../../../shared/domain/AggregateRoot.js';
import type { PlantRepository } from '../../plants/domain/repositories/PlantRepository.js';
import type { PlantInstance } from './entities/PlantInstance.js';
import { BasicSpatialService } from './services/BasicSpatialService.js';
import type { SpatialService } from './services/SpatialService.js';

export interface BedProps {
  id: string;
  width: number;
  height: number;
  plantInstances?: PlantInstance[];
}

export class Bed extends AggregateRoot {
  private readonly props: BedProps & { plantInstances: PlantInstance[] };

  constructor(
    props: BedProps,
    private readonly spatialService: SpatialService = new BasicSpatialService()
  ) {
    super();

    this.props = {
      ...props,
      plantInstances: props.plantInstances ?? []
    };
  }

  get id(): string {
    return this.props.id;
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  get plants(): PlantInstance[] {
    return this.props.plantInstances;
  }

  async addPlant(
    plantInstance: PlantInstance,
    plantRepository: PlantRepository
  ): Promise<void> {
    await this.spatialService.validatePlacement(
      {
        width: this.props.width,
        height: this.props.height,
        plants: this.props.plantInstances
      },
      plantInstance,
      plantRepository
    );

    this.props.plantInstances.push(plantInstance);
  }

  removePlant(plantId: string): void {
    this.props.plantInstances = this.props.plantInstances.filter(
      (p) => p.id !== plantId
    );
  }

  toPrimitives(): Record<string, unknown> {
    return {
      id: this.props.id,
      width: this.props.width,
      height: this.props.height,
      plantInstances: this.props.plantInstances.map((p) => ({
        id: p.id,
        plantId: p.plantId,
        position: p.position,
        status: p.status
      }))
    };
  }
}
