import { AggregateRoot } from '../../../../shared/domain/AggregateRoot.js';
import type { Serializable } from '../../../../shared/domain/interfaces/index.js';
import type { Uuid } from '../../../../shared/domain/valueObject/index.js';
import type { PlantRepository } from '../../plants/domain/repositories/PlantRepository.js';
import type { PlantInstance } from './entities/PlantInstance.js';
import type { BedPrimitives, BedProps } from './interfaces/index.js';
import { BasicSpatialService } from './services/spatial/BasicSpatialService.js';
import type { SpatialService } from './services/spatial/interfaces/SpatialService.js';

export class Bed
  extends AggregateRoot<Uuid>
  implements Serializable<BedPrimitives>
{
  private readonly props: BedProps & { plantInstances: PlantInstance[] };

  constructor(
    id: Uuid,
    props: BedProps,
    private readonly spatialService: SpatialService = new BasicSpatialService()
  ) {
    super(id);

    this.props = {
      ...props,
      plantInstances: props.plantInstances ?? []
    };
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  get plants(): readonly PlantInstance[] {
    return [...this.props.plantInstances];
  }

  async addPlant(
    plantInstance: PlantInstance,
    plantRepository: PlantRepository
  ): Promise<void> {
    await this.spatialService.validatePlacement(
      {
        width: this.props.width,
        height: this.props.height,
        plants: [...this.props.plantInstances]
      },
      plantInstance,
      plantRepository
    );

    this.props.plantInstances.push(plantInstance);
  }

  removePlant(plantId: Uuid): void {
    const index = this.props.plantInstances.findIndex((p) =>
      p.id.equals(plantId)
    );

    if (index === -1) return;

    this.props.plantInstances.splice(index, 1);
  }

  toPrimitives(): BedPrimitives {
    return {
      id: this.id.value,
      width: this.props.width,
      height: this.props.height,
      plantInstances: this.props.plantInstances.map((p) => p.toPrimitives())
    };
  }
}
