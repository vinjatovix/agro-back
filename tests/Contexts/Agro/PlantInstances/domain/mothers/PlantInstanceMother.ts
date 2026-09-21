import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import {
  CropGrowthStatus,
  PlantInstanceLifecycleStatus
} from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import type { PlantInstanceProps } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantInstanceProps.js';
import { randomPlantInstanceId } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/PlantInstanceId.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';

export class PlantInstanceMother {
  static create(overrides: Partial<PlantInstanceProps> = {}): PlantInstance {
    return new PlantInstance({
      id: randomPlantInstanceId(),
      userId: randomUserId(),
      plantId: randomPlantId(),
      position: new Coordinates(50, 50),
      growthStatus: CropGrowthStatus.PLANTED,
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
      plantedAt: new Date(),
      ...overrides
    });
  }

  static atPosition(
    x: number,
    y: number,
    overrides: Partial<PlantInstanceProps> = {}
  ): PlantInstance {
    return this.create({
      position: new Coordinates(x, y),
      ...overrides
    });
  }

  static fromPlantAtPosition(
    plant: Plant,
    x: number,
    y: number,
    overrides: Partial<PlantInstanceProps> = {}
  ): PlantInstance {
    return this.create({
      plantId: plant.id,
      position: new Coordinates(x, y),
      ...overrides
    });
  }
}
