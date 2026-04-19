import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import { createPlantCatalog } from '../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';

const { plantRepository } = createPlantCatalog();

describe('Bed + SpatialService (integration)', () => {
  const createBed = () =>
    new Bed({
      id: 'bed_1',
      width: 200,
      height: 200,
      plantInstances: []
    });

  it('should add multiple plants correctly when valid', async () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(80, 50);

    await bed.addPlant(p1, plantRepository);
    await bed.addPlant(p2, plantRepository);

    expect(bed.plants.length).toBe(2);
  });

  it('should prevent adding a plant that collides', async () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(55, 55);

    await bed.addPlant(p1, plantRepository);

    await expect(bed.addPlant(p2, plantRepository)).rejects.toThrow(
      'Collision detected'
    );

    expect(bed.plants.length).toBe(1);
  });

  it('should prevent adding a plant outside bounds', async () => {
    const bed = createBed();

    const plant = PlantInstanceMother.atPosition(5, 5);

    await expect(bed.addPlant(plant, plantRepository)).rejects.toThrow(
      'Plant out of bounds (min limit)'
    );

    expect(bed.plants.length).toBe(0);
  });

  it('should allow plants exactly touching (no collision)', async () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(70, 50);

    await bed.addPlant(p1, plantRepository);
    await bed.addPlant(p2, plantRepository);

    expect(bed.plants.length).toBe(2);
  });

  it('should allow plants on boundary edge', async () => {
    const bed = createBed();

    const plant = PlantInstanceMother.atPosition(10, 10);

    await bed.addPlant(plant, plantRepository);

    expect(bed.plants.length).toBe(1);
  });

  it('should continue working after removing a plant', async () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(55, 55);

    await bed.addPlant(p1, plantRepository);
    bed.removePlant(p1.id);

    await expect(bed.addPlant(p2, plantRepository)).resolves.not.toThrow();

    expect(bed.plants.length).toBe(1);
  });
});
