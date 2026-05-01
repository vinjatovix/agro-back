import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import type { PlantInstanceProps } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantInstanceProps.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifeCicleStatus.js';
import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { UuidMother } from '../../../../shared/fixtures/index.js';

export class PlantInstanceMother {
  static create(overrides: Partial<PlantInstanceProps> = {}): PlantInstance {
    return new PlantInstance({
      id: UuidMother.random(),
      userId: UuidMother.random(),
      plantId: UuidMother.random(),
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
