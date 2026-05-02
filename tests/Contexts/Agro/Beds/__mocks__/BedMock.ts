import type { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { PlantInstance } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import type { SpatialPlantModel } from '../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';
import { UuidMother } from '../../../shared/fixtures/UuidMother.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { StringValueObject } from '../../../../../src/Contexts/shared/domain/valueObject/StringValueObject.js';

type AddPlantCall = [PlantInstance, SpatialPlantModel, SpatialPlantModel[]];

export class BedMock {
  private readonly addPlantMock = jest.fn<
    ReturnType<Bed['addPlant']>,
    Parameters<Bed['addPlant']>
  >();

  toBed(): Bed {
    return {
      id: UuidMother.random(),
      userId: UuidMother.random(),
      name: new StringValueObject('Test Bed'),
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100),
      depth: PositiveNumber.create(30),
      metadata: Metadata.create('test'),
      plantInstances: [],
      addPlant: this.addPlantMock
    } as unknown as Bed;
  }

  assertAddPlantCalledTimes(expected: number): void {
    expect(this.addPlantMock).toHaveBeenCalledTimes(expected);
  }

  assertAddPlantCalledWith(
    plant: PlantInstance,
    newSpatial: SpatialPlantModel,
    existing: SpatialPlantModel[]
  ): void {
    expect(this.addPlantMock).toHaveBeenCalledWith(plant, newSpatial, existing);
  }

  private getLastCall(): AddPlantCall {
    const calls = this.addPlantMock.mock.calls as AddPlantCall[];

    if (calls.length === 0) {
      throw new Error('addPlant was not called');
    }

    return calls.at(-1)!;
  }

  getLastNewSpatialPlant(): SpatialPlantModel {
    return this.getLastCall()[1];
  }

  getLastExistingSpatialPlant(): SpatialPlantModel[] {
    return this.getLastCall()[2];
  }
}
