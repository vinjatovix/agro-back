import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';
import { createPlantCatalog } from './services/fixtures/plantCatalogFixture.js';

const { getPlant } = createPlantCatalog();

describe('Bed + SpatialService (integration)', () => {
  const createBed = () =>
    new Bed({
      id: 'bed_1',
      width: 200,
      height: 200,
      plantInstances: []
    });

  it('should add multiple plants correctly when valid', () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(80, 50);

    bed.addPlant(p1, getPlant);
    bed.addPlant(p2, getPlant);

    expect(bed.plants.length).toBe(2);
  });

  it('should prevent adding a plant that collides', () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(55, 55);

    bed.addPlant(p1, getPlant);

    expect(() => bed.addPlant(p2, getPlant)).toThrow('Collision detected');
    expect(bed.plants.length).toBe(1);
  });

  it('should prevent adding a plant outside bounds', () => {
    const bed = createBed();

    const plant = PlantInstanceMother.atPosition(5, 5);

    expect(() => bed.addPlant(plant, getPlant)).toThrow(
      'Plant out of bounds (min limit)'
    );

    expect(bed.plants.length).toBe(0);
  });

  it('should allow plants exactly touching (no collision)', () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(70, 50); // 10 + 10

    bed.addPlant(p1, getPlant);
    bed.addPlant(p2, getPlant);

    expect(bed.plants.length).toBe(2);
  });

  it('should allow plants on boundary edge', () => {
    const bed = createBed();

    const plant = PlantInstanceMother.atPosition(10, 10); // radius = 10

    bed.addPlant(plant, getPlant);

    expect(bed.plants.length).toBe(1);
  });

  it('should continue working after removing a plant', () => {
    const bed = createBed();

    const p1 = PlantInstanceMother.atPosition(50, 50);
    const p2 = PlantInstanceMother.atPosition(55, 55);

    bed.addPlant(p1, getPlant);
    bed.removePlant(p1.id);

    expect(() => bed.addPlant(p2, getPlant)).not.toThrow();
    expect(bed.plants.length).toBe(1);
  });
});
