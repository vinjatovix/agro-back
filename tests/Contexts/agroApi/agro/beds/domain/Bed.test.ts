import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { createPlantCatalog } from '../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';
import type { SpatialService } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/services/SpatialService.js';

const { plantRepository } = createPlantCatalog();

describe('Bed (unit)', () => {
  let validatePlacement: jest.Mock;
  let spatialService: SpatialService;

  let bed: Bed;

  beforeAll(() => {
    validatePlacement = jest.fn().mockResolvedValue(undefined);

    spatialService = {
      validatePlacement
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();

    bed = new Bed(
      UuidMother.random(),
      {
        width: 200,
        height: 200,
        plantInstances: []
      },
      spatialService
    );
  });

  it('should start with empty plant list', () => {
    expect(bed.plants).toHaveLength(0);
  });

  it('should add plant when spatial service allows it', async () => {
    const plant = PlantInstanceMother.atPosition(50, 50);

    await bed.addPlant(plant, plantRepository);

    expect(bed.plants).toHaveLength(1);
    expect(bed.plants[0]).toBe(plant);
  });

  it('should call spatial service before adding plant', async () => {
    const plant = PlantInstanceMother.atPosition(10, 10);

    await bed.addPlant(plant, plantRepository);

    const expectedContext: Partial<{
      width: number;
      height: number;
      plants: unknown[];
    }> = {
      width: 200,
      height: 200,
      plants: expect.any(Array) as unknown[]
    };

    expect(validatePlacement).toHaveBeenCalledTimes(1);

    expect(validatePlacement).toHaveBeenCalledWith(
      expect.objectContaining(expectedContext),
      plant,
      plantRepository
    );
  });

  it('should not mutate state if spatial validation fails', async () => {
    validatePlacement.mockRejectedValueOnce(new Error('invalid'));

    const plant = PlantInstanceMother.atPosition(10, 10);

    await expect(bed.addPlant(plant, plantRepository)).rejects.toThrow(
      'invalid'
    );

    expect(bed.plants).toHaveLength(0);
  });

  it('should remove plant by id', () => {
    const plant = PlantInstanceMother.atPosition(50, 50);

    bed = new Bed(
      bed.id,
      {
        width: 200,
        height: 200,
        plantInstances: [plant]
      },
      spatialService
    );

    bed.removePlant(plant.id);

    expect(bed.plants).toHaveLength(0);
  });

  it('should do nothing when removing non-existent plant', () => {
    bed.removePlant(UuidMother.random());

    expect(bed.plants).toHaveLength(0);
  });

  it('should expose correct dimensions and id', () => {
    expect(bed.id).toBeDefined();
    expect(bed.width).toBe(200);
    expect(bed.height).toBe(200);
  });

  it('should serialize to primitives correctly', () => {
    const plant = PlantInstanceMother.atPosition(50, 50);

    bed = new Bed(
      bed.id,
      {
        width: 200,
        height: 200,
        plantInstances: [plant]
      },
      spatialService
    );

    const result = bed.toPrimitives();

    expect(result).toEqual(
      expect.objectContaining({
        id: bed.id.value,
        width: 200,
        height: 200,
        plantInstances: expect.arrayContaining([
          expect.objectContaining({
            id: plant.id.value,
            plantId: plant.plantId.value
          })
        ]) as unknown[]
      })
    );
  });

  it('should pass plants array to spatial service on add', async () => {
    const plant1 = PlantInstanceMother.atPosition(10, 10);
    const plant2 = PlantInstanceMother.atPosition(20, 20);

    await bed.addPlant(plant1, plantRepository);
    await bed.addPlant(plant2, plantRepository);

    expect(validatePlacement).toHaveBeenLastCalledWith(
      expect.objectContaining({
        plants: expect.any(Array) as unknown[]
      }),
      plant2,
      plantRepository
    );
  });

  it('should call spatial service before mutating state', async () => {
    const plant = PlantInstanceMother.atPosition(10, 10);

    let capturedPlants: unknown;

    validatePlacement.mockImplementation((context: { plants: unknown[] }) => {
      capturedPlants = context.plants;
      return Promise.resolve();
    });

    await bed.addPlant(plant, plantRepository);

    expect(capturedPlants).toHaveLength(0);
  });
});
