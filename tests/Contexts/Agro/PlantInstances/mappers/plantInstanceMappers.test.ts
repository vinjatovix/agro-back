import { PlantInstanceLifecycleStatus } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import { plantInstanceDomainMapper } from '../../../../../src/Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import { plantInstancePersistenceMapper } from '../../../../../src/Contexts/Agro/PlantInstances/mappers/plantInstancePersistenceMapper.js';
import { Coordinates } from '../../../../../src/shared/domain/value-objects/Coordinates.js';
import { PlantInstanceMother } from '../domain/mothers/PlantInstanceMother.js';

describe('PlantInstance Mappers', () => {
  describe('plantInstancePersistenceMapper', () => {
    it('maps PlantInstance aggregate to Mongo document with all fields', () => {
      const plant = PlantInstanceMother.create({
        position: new Coordinates(20, 30),
        variety: 'San Marzano',
        notes: 'Needs staking',
        instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
        removedAt: new Date('2026-06-01T10:00:00.000Z')
      });

      const doc = plantInstancePersistenceMapper.toMongoDocument(plant);

      expect(doc.position).toEqual({ x: 20, y: 30 });
      expect(doc.variety).toBe('San Marzano');
      expect(doc.notes).toBe('Needs staking');
      expect(doc.instanceStatus).toBe('removed');
      expect(doc.removedAt).toBe('2026-06-01T10:00:00.000Z');
      expect(doc.version).toBe(plant.version);
    });

    it('omits position completely from Mongo document when position is undefined', () => {
      const plant = PlantInstanceMother.create({
        position: undefined
      });

      const doc = plantInstancePersistenceMapper.toMongoDocument(plant);

      expect('position' in doc).toBe(false);
      expect(doc.position).toBeUndefined();
    });

    it('maps Mongo document back to PlantInstance aggregate', () => {
      const original = PlantInstanceMother.create({
        position: new Coordinates(45, 60),
        variety: 'Cherry',
        notes: 'Sweet variety'
      });
      const doc = plantInstancePersistenceMapper.toMongoDocument(original);

      const restored = plantInstancePersistenceMapper.fromMongoDocument(doc);

      expect(restored.id).toBe(original.id);
      expect(restored.userId).toBe(original.userId);
      expect(restored.bedId).toBe(original.bedId);
      expect(restored.plantId).toBe(original.plantId);
      expect(restored.position?.x).toBe(45);
      expect(restored.position?.y).toBe(60);
      expect(restored.variety).toBe('Cherry');
      expect(restored.notes).toBe('Sweet variety');
      expect(restored.version).toBe(original.version);
    });
  });

  describe('plantInstanceDomainMapper', () => {
    it('maps PlantInstance to primitives', () => {
      const plant = PlantInstanceMother.create({
        position: new Coordinates(12, 34),
        variety: 'Cherokee Purple'
      });

      const primitives = plantInstanceDomainMapper.toPrimitives(plant);

      expect(primitives.id).toBe(plant.id);
      expect(primitives.position).toEqual({ x: 12, y: 34 });
      expect(primitives.variety).toBe('Cherokee Purple');
    });

    it('maps primitives back to PlantInstance', () => {
      const plant = PlantInstanceMother.create({
        position: new Coordinates(15, 25)
      });
      const primitives = plantInstanceDomainMapper.toPrimitives(plant);

      const restored = plantInstanceDomainMapper.fromPrimitives(primitives);

      expect(restored.id).toBe(plant.id);
      expect(restored.position?.x).toBe(15);
      expect(restored.position?.y).toBe(25);
    });
  });
});
