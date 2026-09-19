import { addPlantToBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/addPlantToBed.js';
import type { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { BedMock } from '../../__mocks__/BedMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';

const DEFAULT_PLANT_SPACING = 50;

describe('addPlantToBed', () => {
  let plantRepository: PlantRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let plant: Plant;
  let bedMock: BedMock;

  beforeEach(() => {
    plantRepository = new PlantRepositoryMock();
    plant = PlantFactory.tomato();
    plantRepository.addToStorage(plant);
    bedMock = new BedMock();
    bedRepository = new BedRepositoryMock();
  });

  it('builds spatial model and calls bed.addPlant with correct arguments', async () => {
    const bed = bedMock.toBed();
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await addPlantToBed({
      bed,
      plantInstance,
      plantRepository,
      bedRepository,
      user: 'test-user'
    });

    bedMock.assertAddPlantCalledTimes(1);
    bedMock.assertAddPlantCalledWith(
      plantInstance,
      {
        id: plantInstance.id.value,
        plantId: plantInstance.plantId.value,
        position: plantInstance.position,
        spacingCm: DEFAULT_PLANT_SPACING
      },
      []
    );
    plantRepository.assertFindByIdHasBeenCalledWith(
      plantInstance.plantId.value
    );
  });

  it('maps existing bed plants into spatial models', async () => {
    const bed = bedMock.toBed();
    const existing = PlantInstanceMother.fromPlantAtPosition(plant, 30, 40);
    (bed.plantInstances as PlantInstance[]) = [existing];
    bedRepository.addToStorage(bed);
    const newPlant = PlantInstanceMother.fromPlantAtPosition(plant, 10, 20);

    await addPlantToBed({
      bed,
      plantInstance: newPlant,
      plantRepository,
      bedRepository,
      user: 'test-user'
    });

    const existingSpatial = bedMock.getLastExistingSpatialPlant();
    expect(existingSpatial).toHaveLength(1);
    expect(existingSpatial[0]).toEqual({
      id: existing.id.value,
      plantId: existing.plantId.value,
      position: existing.position,
      spacingCm: DEFAULT_PLANT_SPACING
    });
  });

  it('uses spacingCm from plant repository', async () => {
    const bed = bedMock.toBed();
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await addPlantToBed({
      bed,
      plantInstance,
      plantRepository,
      bedRepository,
      user: 'test-user'
    });

    const newSpatial = bedMock.getLastNewSpatialPlant();
    expect(newSpatial.spacingCm).toBe(DEFAULT_PLANT_SPACING);
  });

  it('passes full spatial context including all existing plants', async () => {
    const bed = bedMock.toBed();
    const p1 = PlantInstanceMother.fromPlantAtPosition(plant, 0, 0);
    const p2 = PlantInstanceMother.fromPlantAtPosition(plant, 10, 10);
    (bed.plantInstances as PlantInstance[]) = [p1, p2];
    bedRepository.addToStorage(bed);

    const newPlant = PlantInstanceMother.fromPlantAtPosition(plant, 20, 20);
    await addPlantToBed({
      bed,
      plantInstance: newPlant,
      plantRepository,
      bedRepository,
      user: 'test-user'
    });

    const existingSpatial = bedMock.getLastExistingSpatialPlant();
    expect(existingSpatial).toHaveLength(2);
    expect(existingSpatial.map((p) => p.id)).toEqual([
      p1.id.value,
      p2.id.value
    ]);
  });
});
