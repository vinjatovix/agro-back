import { plantPersistenceMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { PlantFactory } from '../domain/mothers/PlantFactory.js';
import { PollinationType } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';

describe('PlantPersistenceMapper', () => {
  describe('toMongoDocument', () => {
    it('should map basic plant to mongo document', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc._id).toBeDefined();
      expect(doc.identity.name.primary).toBe(plant.identity.name.primary);
      expect(doc.traits.lifecycle).toBe(plant.traits.lifecycle.getValue());
    });

    it('should map phenology correctly', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.phenology.sowing.seedsPerHole).toEqual(
        plant.phenology.sowing.seedsPerHole.toPrimitives()
      );

      expect(doc.phenology.flowering.months).toEqual(
        plant.phenology.flowering.months.toArray()
      );
    });

    it('should include pollination when present', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.phenology.flowering.pollination).toBeDefined();
      expect(doc.phenology.flowering.pollination?.type).toBe(
        PollinationType.INSECT
      );
    });

    it('should omit pollination when not present', () => {
      const plant = PlantFactory.lettuce(); // no pollination

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.phenology.flowering.pollination).toBeUndefined();
    });

    it('should include harvest description when present', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.phenology.harvest.description).toBeDefined();
    });

    it('should omit knowledge when empty', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.knowledge).toEqual({});
    });

    it('should include knowledge when present', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.knowledge).toBeDefined();
    });

    it('should map deletedAt correctly', () => {
      const plant = PlantFactory.create();
      plant.deletedAt = new Date();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.deletedAt).toBeDefined();
      expect(typeof doc.deletedAt).toBe('string');
    });
  });

  describe('fromMongoDocument', () => {
    it('should map mongo document to domain', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.id.value).toBe(plant.id.value);
      expect(restored.identity.name.primary).toBe(plant.identity.name.primary);
    });

    it('should map pollination correctly', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.phenology.flowering.pollination).toBeDefined();
      expect(restored.phenology.flowering.pollination?.type).toBe(
        PollinationType.INSECT
      );
    });

    it('should handle missing pollination', () => {
      const plant = PlantFactory.lettuce();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.phenology.flowering.pollination).toBeUndefined();
    });

    it('should map deletedAt correctly', () => {
      const plant = PlantFactory.create();
      plant.markAsDeleted();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.status).toBe(PlantStatus.DELETED);
      expect(restored.deletedAt?.toISOString()).toBe(
        plant.deletedAt?.toISOString()
      );
    });

    it('should fallback to empty knowledge', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.knowledge).toBeDefined();
    });
  });

  describe('reversibility', () => {
    it('should be fully reversible (full plant)', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);
      const doc2 = plantPersistenceMapper.toMongoDocument(restored);

      expect(doc2).toMatchObject(doc);
    });
  });
});
