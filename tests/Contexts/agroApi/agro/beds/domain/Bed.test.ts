import type { SpatialService } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/services/SpatialService.js';
import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import type { PlantInstance } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';
import { createPlantCatalog } from '../helpers/InMemoryPlantRepository.js';

const { plantRepository } = createPlantCatalog();

describe('Bed', () => {
  const createBed = (plants: PlantInstance[] = []) =>
    new Bed({
      id: 'bed_1',
      width: 200,
      height: 200,
      plantInstances: plants
    });

  it('should add plant inside bounds without collision', async () => {
    const bed = createBed();
    const plant = PlantInstanceMother.atPosition(50, 50);

    await bed.addPlant(plant, plantRepository);

    expect(bed.plants.length).toBe(1);
  });

  it('should throw on collision', async () => {
    const plant1 = PlantInstanceMother.atPosition(50, 50);
    const plant2 = PlantInstanceMother.atPosition(55, 55);

    const bed = createBed([plant1]);

    await expect(bed.addPlant(plant2, plantRepository)).rejects.toThrow(
      'Collision detected'
    );
  });

  it('should delegate placement validation to spatial service', async () => {
    const validatePlacement = jest.fn().mockResolvedValue(undefined);

    const mockService: SpatialService = {
      validatePlacement
    };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      mockService
    );

    const plant = PlantInstanceMother.atPosition(50, 50);

    await bed.addPlant(plant, plantRepository);

    expect(validatePlacement).toHaveBeenCalledTimes(1);
  });

  it('should not add plant if spatial validation fails', async () => {
    const mockService: SpatialService = {
      validatePlacement: jest.fn().mockRejectedValue(new Error('fail'))
    };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      mockService
    );

    const plant = PlantInstanceMother.atPosition(50, 50);

    await expect(bed.addPlant(plant, plantRepository)).rejects.toThrow();

    expect(bed.plants.length).toBe(0);
  });

  it('should remove plant by id', () => {
    const plant = PlantInstanceMother.atPosition(50, 50);
    const bed = createBed([plant]);

    bed.removePlant(plant.id);

    expect(bed.plants.length).toBe(0);
  });

  it('should do nothing if plant does not exist', () => {
    const bed = createBed([]);

    expect(() => bed.removePlant('non-existent')).not.toThrow();
  });

  it('should expose correct dimensions and id', () => {
    const bed = createBed([]);

    expect(bed.id).toBe('bed_1');
    expect(bed.width).toBe(200);
    expect(bed.height).toBe(200);
  });

  it('should convert to primitives correctly', () => {
    const plant = PlantInstanceMother.atPosition(50, 50);
    const bed = createBed([plant]);

    const result = bed.toPrimitives();

    expect(result).toMatchObject({
      id: 'bed_1',
      width: 200,
      height: 200,
      plantInstances: [
        expect.objectContaining({
          id: plant.id,
          plantId: plant.plantId
        })
      ]
    });
  });

  it('should call spatial service before mutating state', async () => {
    const validatePlacement = jest.fn().mockResolvedValue(undefined);

    const service: SpatialService = {
      validatePlacement
    };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      service
    );

    const plant = PlantInstanceMother.atPosition(10, 10);

    await bed.addPlant(plant, plantRepository);

    expect(validatePlacement).toHaveBeenCalled();
    expect(bed.plants).toHaveLength(1);
  });
});
