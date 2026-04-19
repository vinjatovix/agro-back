import {
  PlantInstance,
  type PlantInstanceProps
} from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { Coordinates } from '../../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { random } from '../../../../Auth/fixtures/shared/index.js';

export class PlantInstanceMother {
  static create(overrides: Partial<PlantInstanceProps> = {}): PlantInstance {
    return new PlantInstance({
      id: random.uuid(),
      userId: 'user_1',
      plantId: random.uuid(),
      position: new Coordinates(50, 50),
      status: 'planted',
      plantedAt: new Date(),
      ...overrides
    });
  }

  static atPosition(
    x: number,
    y: number,
    overrides: Partial<PlantInstanceProps> = {}
  ) {
    return this.create({
      position: new Coordinates(x, y),
      ...overrides
    });
  }
}
