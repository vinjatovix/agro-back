import type { SpatialService } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/services/SpatialService.js';
import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import type { PlantInstance } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';
import { createPlantCatalog } from './services/fixtures/plantCatalogFixture.js';

const { getPlant } = createPlantCatalog();

describe('Bed', () => {
  const createBed = (plants: PlantInstance[] = []) =>
    new Bed({
      id: 'bed_1',
      width: 200,
      height: 200,
      plantInstances: plants
    });

  it('should add plant inside bounds without collision', () => {
    const bed = createBed();

    const plant = PlantInstanceMother.atPosition(50, 50);

    bed.addPlant(plant, getPlant);

    expect(bed.plants.length).toBe(1);
  });

  it('should throw on collision', () => {
    const plant1 = PlantInstanceMother.atPosition(50, 50);
    const plant2 = PlantInstanceMother.atPosition(55, 55);

    const bed = createBed([plant1]);

    expect(() => bed.addPlant(plant2, getPlant)).toThrow('Collision detected');
  });

  it('should delegate placement validation to spatial service', () => {
    const validatePlacement = jest.fn();

    const mockService: SpatialService = {
      validatePlacement
    };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      mockService
    );

    const plant = PlantInstanceMother.atPosition(50, 50);

    bed.addPlant(plant, getPlant);

    expect(validatePlacement).toHaveBeenCalledTimes(1);
  });

  it('should not add plant if spatial validation fails', () => {
    const mockService: SpatialService = {
      validatePlacement: jest.fn(() => {
        throw new Error('fail');
      })
    };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      mockService
    );

    const plant = PlantInstanceMother.atPosition(50, 50);

    expect(() => bed.addPlant(plant, getPlant)).toThrow();

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

  it('should call spatial service before mutating state', () => {
    const service = { validatePlacement: jest.fn() };

    const bed = new Bed(
      { id: 'bed_1', width: 200, height: 200, plantInstances: [] },
      service
    );

    const plant = PlantInstanceMother.atPosition(10, 10);

    bed.addPlant(plant, getPlant);

    expect(service.validatePlacement).toHaveBeenCalled();
    expect(bed.plants).toHaveLength(1);
  });
});
