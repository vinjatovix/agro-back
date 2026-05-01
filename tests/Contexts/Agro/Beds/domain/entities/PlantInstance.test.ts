import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifeCicleStatus.js';
import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';
import { PlantInstanceScenarios } from '../scenarios/PlantInstanceScenarios.js';

describe('PlantInstance', () => {
  it('should create a valid plant instance', () => {
    const plant = PlantInstanceMother.create();

    expect(plant.id).toBeDefined();
    expect(plant.plantId).toBeDefined();
    expect(plant.position).toBeInstanceOf(Coordinates);
    expect(plant.growthStatus).toBe('planted');
  });

  it('should store position correctly', () => {
    const plant = PlantInstanceMother.create({
      position: new Coordinates(10, 20)
    });

    expect(plant.position.x).toBe(10);
    expect(plant.position.y).toBe(20);
  });

  it('should preserve coordinates through serialization', () => {
    const plantInstance = PlantInstanceMother.atPosition(10, 20);

    const result = plantInstance.toPrimitives();

    expect(result.position.x).toBe(10);
    expect(result.position.y).toBe(20);
  });

  it('should allow different statuses', () => {
    const seeded = PlantInstanceScenarios.seeded();
    const planted = PlantInstanceScenarios.planted();
    const growing = PlantInstanceScenarios.growing();
    const harvested = PlantInstanceScenarios.harvested();

    expect(seeded.growthStatus).toBe(CropGrowthStatus.SEEDED);
    expect(planted.growthStatus).toBe(CropGrowthStatus.PLANTED);
    expect(growing.growthStatus).toBe(CropGrowthStatus.GROWING);
    expect(harvested.growthStatus).toBe(CropGrowthStatus.HARVESTED);
  });

  it('should accept optional metadata fields', () => {
    const plant = PlantInstanceMother.create({
      notes: 'test note',
      variety: 'tomato cherry'
    });

    expect(plant).toBeDefined();
  });

  it('should allow removedAt only when status is removed', () => {
    const plant = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date()
    });

    expect(plant.instanceStatus).toBe(PlantInstanceLifecycleStatus.REMOVED);
    expect(plant).toBeDefined();
  });

  it('should not allow removedAt when status is not REMOVED', () => {
    expect(() =>
      PlantInstanceMother.create({
        growthStatus: CropGrowthStatus.PLANTED,
        instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
        removedAt: new Date()
      })
    ).toThrow('Invalid PlantInstance');
  });

  it('should allow removal date when plant is removed', () => {
    const date = new Date();

    const plant = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: date
    });

    expect(plant).toBeDefined();
  });

  it('should not include optional fields when not provided', () => {
    const plantInstance = PlantInstanceMother.create();

    const result = plantInstance.toPrimitives();

    expect('variety' in result).toBe(false);
    expect('notes' in result).toBe(false);
    expect('removedAt' in result).toBe(false);
  });

  it('should serialize removedAt when present', () => {
    const date = new Date();

    const plantInstance = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: date
    });

    const result = plantInstance.toPrimitives();

    expect(result.removedAt).toBe(date.toISOString());
  });

  it('should preserve data through from/to primitives', () => {
    const original = PlantInstanceMother.create({
      variety: 'Roma',
      notes: 'test note',
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date()
    });

    const primitives = original.toPrimitives();
    const restored = PlantInstance.fromPrimitives(primitives);

    expect(restored.toPrimitives()).toEqual(primitives);
  });

  it('should preserve identity', () => {
    const id = UuidMother.random();
    const plant = PlantInstanceMother.create({
      id
    });

    expect(plant.id).toBe(id);
  });
});
