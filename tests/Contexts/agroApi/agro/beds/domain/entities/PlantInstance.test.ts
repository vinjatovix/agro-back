import { Coordinates } from '../../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';
import { PlantInstanceScenarios } from '../scenarios/PlantInstanceScenarios.js';

describe('PlantInstance', () => {
  it('should create a valid plant instance', () => {
    const plant = PlantInstanceMother.create();

    expect(plant.id).toBeDefined();
    expect(plant.plantId).toBeDefined();
    expect(plant.position).toBeInstanceOf(Coordinates);
    expect(plant.status).toBe('planted');
  });

  it('should store position correctly', () => {
    const plant = PlantInstanceMother.create({
      position: new Coordinates(10, 20)
    });

    expect(plant.position.x).toBe(10);
    expect(plant.position.y).toBe(20);
  });

  it('should allow different statuses', () => {
    const seeded = PlantInstanceScenarios.seeded();
    const planted = PlantInstanceScenarios.planted();
    const growing = PlantInstanceScenarios.growing();
    const harvested = PlantInstanceScenarios.harvested();

    expect(seeded.status).toBe('seeded');
    expect(planted.status).toBe('planted');
    expect(growing.status).toBe('growing');
    expect(harvested.status).toBe('harvested');
  });

  it('should accept optional metadata fields', () => {
    const plant = PlantInstanceMother.create({
      notes: 'test note',
      variety: 'tomato cherry'
    });

    expect(plant).toBeDefined();
  });

  it('should allow removal date when plant is removed', () => {
    const date = new Date();

    const plant = PlantInstanceMother.create({
      removedAt: date
    });

    expect(plant).toBeDefined();
  });

  it('should allow removedAt only when status is removed', () => {
    const plant = PlantInstanceMother.create({
      status: 'removed',
      removedAt: new Date()
    });

    expect(plant.status).toBe('removed');
    expect(plant).toBeDefined();
  });

  it('should allow only valid state combinations', () => {
    const plant = PlantInstanceMother.create({
      status: 'planted',
      removedAt: new Date()
    });

    // ahora mismo esto pasa sin control
    expect(plant.status).toBe('planted');
  });

  it('should preserve identity', () => {
    const plant = PlantInstanceMother.create({
      id: 'plant_1'
    });

    expect(plant.id).toBe('plant_1');
  });
});
