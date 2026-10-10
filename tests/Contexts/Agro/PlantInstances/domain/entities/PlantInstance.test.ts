import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import { randomPlantInstanceId } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/PlantInstanceId.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';
import { PlantInstanceScenarios } from '../scenarios/PlantInstanceScenarios.js';

describe('PlantInstance', () => {
  it('creates a valid plant instance aggregate root', () => {
    const id = randomPlantInstanceId();
    const userId = randomUserId();
    const bedId = randomBedId();
    const plantId = randomPlantId();
    const position = new Coordinates(10, 20);
    const metadata = Metadata.create('gardener');

    const plant = PlantInstance.create({
      id,
      userId,
      bedId,
      plantId,
      position,
      growthStatus: CropGrowthStatus.PLANTED,
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
      plantedAt: new Date('2026-05-01T10:00:00.000Z'),
      metadata,
      version: 0
    });

    expect(plant.id).toBe(id);
    expect(plant.userId).toBe(userId);
    expect(plant.bedId).toBe(bedId);
    expect(plant.plantId).toBe(plantId);
    expect(plant.position).toEqual(position);
    expect(plant.growthStatus).toBe(CropGrowthStatus.PLANTED);
    expect(plant.instanceStatus).toBe(PlantInstanceLifecycleStatus.ACTIVE);
    expect(plant.version).toBe(0);
    expect(plant.metadata).toBe(metadata);
  });

  it('allows position to be undefined', () => {
    const plant = PlantInstanceMother.create({
      position: undefined
    });

    expect(plant.position).toBeUndefined();
  });

  it('throws when coordinates are negative', () => {
    expect(() =>
      PlantInstanceMother.create({
        position: new Coordinates(-1, 10)
      })
    ).toThrow(InvalidArgumentException);
  });

  it.each([
    [CropGrowthStatus.SEEDED, PlantInstanceScenarios.seeded],
    [CropGrowthStatus.PLANTED, PlantInstanceScenarios.planted],
    [CropGrowthStatus.GROWING, PlantInstanceScenarios.growing],
    [CropGrowthStatus.HARVESTED, PlantInstanceScenarios.harvested]
  ])('supports %s growth status', (expectedStatus, factory) => {
    const plant = factory();

    expect(plant.growthStatus).toBe(expectedStatus);
  });

  it('throws InvalidArgumentException when removedAt is provided for active instance', () => {
    expect(() =>
      PlantInstanceMother.create({
        instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
        removedAt: new Date()
      })
    ).toThrow(InvalidArgumentException);
  });

  it('allows removedAt when instanceStatus is REMOVED', () => {
    const removalDate = new Date('2026-06-01T12:00:00.000Z');

    const plant = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: removalDate
    });

    expect(plant.instanceStatus).toBe(PlantInstanceLifecycleStatus.REMOVED);
    expect(plant.removedAt).toEqual(removalDate);
  });

  it('updates editable details and touches metadata when fields change', () => {
    const plant = PlantInstanceMother.create({
      variety: 'Old Variety',
      notes: 'Old Note',
      growthStatus: CropGrowthStatus.PLANTED
    });
    const updateTime = new Date('2026-06-15T15:00:00.000Z');

    plant.updateDetails(
      {
        variety: 'New Variety',
        notes: 'New Note',
        growthStatus: CropGrowthStatus.GROWING
      },
      'updater-user',
      updateTime
    );

    expect(plant.variety).toBe('New Variety');
    expect(plant.notes).toBe('New Note');
    expect(plant.growthStatus).toBe(CropGrowthStatus.GROWING);
    expect(plant.metadata.updatedBy).toBe('updater-user');
    expect(plant.metadata.updatedAt).toEqual(updateTime);
  });

  it('clears variety and notes when they are set to null', () => {
    const plant = PlantInstanceMother.create({
      variety: 'Roma',
      notes: 'Near the edge'
    });

    plant.updateDetails({ variety: null, notes: null }, 'updater-user');

    expect(plant.variety).toBeUndefined();
    expect(plant.notes).toBeUndefined();
    expect('variety' in plant.toPrimitives()).toBe(false);
    expect('notes' in plant.toPrimitives()).toBe(false);
  });

  it('keeps variety and notes when they are absent from the changes', () => {
    const plant = PlantInstanceMother.create({
      variety: 'Roma',
      notes: 'Near the edge'
    });

    plant.updateDetails(
      { growthStatus: CropGrowthStatus.GROWING },
      'updater-user'
    );

    expect(plant.variety).toBe('Roma');
    expect(plant.notes).toBe('Near the edge');
  });

  it('does not touch metadata when updateDetails has no state changes', () => {
    const initialMetadata = Metadata.create('gardener');
    const plant = PlantInstanceMother.create({
      variety: 'Roma',
      notes: 'Planted near edges',
      growthStatus: CropGrowthStatus.PLANTED,
      metadata: initialMetadata
    });

    plant.updateDetails(
      {
        variety: 'Roma',
        notes: 'Planted near edges',
        growthStatus: CropGrowthStatus.PLANTED
      },
      'updater-user',
      new Date('2026-07-01T10:00:00.000Z')
    );

    expect(plant.metadata.updatedBy).toBe(initialMetadata.updatedBy);
    expect(plant.metadata.updatedAt).toEqual(initialMetadata.updatedAt);
  });

  it('moves to new position and updates metadata', () => {
    const plant = PlantInstanceMother.atPosition(10, 20);
    const newPosition = new Coordinates(30, 40);
    const moveTime = new Date('2026-06-20T10:00:00.000Z');

    plant.moveTo(newPosition, 'mover-user', moveTime);

    expect(plant.position).toEqual(newPosition);
    expect(plant.metadata.updatedBy).toBe('mover-user');
    expect(plant.metadata.updatedAt).toEqual(moveTime);
  });

  it('does not touch metadata when moving to identical coordinates', () => {
    const initialMetadata = Metadata.create('gardener');
    const plant = PlantInstanceMother.create({
      position: new Coordinates(15, 25),
      metadata: initialMetadata
    });

    plant.moveTo(
      new Coordinates(15, 25),
      'mover-user',
      new Date('2026-06-20T10:00:00.000Z')
    );

    expect(plant.metadata.updatedBy).toBe(initialMetadata.updatedBy);
    expect(plant.metadata.updatedAt).toEqual(initialMetadata.updatedAt);
  });

  it('throws InvalidArgumentException when moving to negative coordinates', () => {
    const plant = PlantInstanceMother.atPosition(10, 20);

    expect(() => plant.moveTo(new Coordinates(-5, 10), 'mover-user')).toThrow(
      InvalidArgumentException
    );
  });

  it('marks active instance as removed', () => {
    const plant = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
    });
    const removalTime = new Date('2026-06-30T10:00:00.000Z');

    plant.markAsRemoved('remover-user', removalTime);

    expect(plant.instanceStatus).toBe(PlantInstanceLifecycleStatus.REMOVED);
    expect(plant.removedAt).toEqual(removalTime);
    expect(plant.metadata.updatedBy).toBe('remover-user');
    expect(plant.metadata.updatedAt).toEqual(removalTime);
  });

  it('throws DomainConflictException when marking an already removed instance as removed', () => {
    const plant = PlantInstanceMother.create({
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date()
    });

    expect(() => plant.markAsRemoved('remover-user')).toThrow(
      DomainConflictException
    );
  });

  it('omits optional undefined properties when serialized to primitives', () => {
    const plant = PlantInstanceMother.create({
      position: undefined,
      variety: undefined,
      notes: undefined,
      removedAt: undefined
    });

    const primitives = plant.toPrimitives();

    expect('position' in primitives).toBe(false);
    expect('variety' in primitives).toBe(false);
    expect('notes' in primitives).toBe(false);
    expect('removedAt' in primitives).toBe(false);
    expect(primitives.version).toBe(0);
    expect(primitives.metadata).toBeDefined();
  });

  it('preserves full state across serialization and deserialization', () => {
    const original = PlantInstanceMother.create({
      position: new Coordinates(25, 35),
      variety: 'Cherry Roma',
      notes: 'Thriving in full sun',
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date('2026-08-01T12:00:00.000Z')
    });

    const primitives = original.toPrimitives();
    const restored = PlantInstance.fromPrimitives(primitives);

    expect(restored.toPrimitives()).toEqual(primitives);
  });
});
