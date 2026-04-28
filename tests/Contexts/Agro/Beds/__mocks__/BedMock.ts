import type { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { PlantInstance } from '../../../../../src/Contexts/Agro/Beds/domain/entities/PlantInstance.js';
import type { SpatialPlantModel } from '../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';

type AddPlantCall = [PlantInstance, SpatialPlantModel, SpatialPlantModel[]];

export class BedMock {
  private readonly addPlantMock = jest.fn<
    ReturnType<Bed['addPlant']>,
    Parameters<Bed['addPlant']>
  >();

  toBed(): Bed {
    return {
      plants: [],
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
