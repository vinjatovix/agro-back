import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { PollinationType } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { plantPersistenceMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { InternalServerError } from '../../../../../src/shared/errors/index.js';
import { PlantFactory } from '../domain/mothers/PlantFactory.js';
import { PlantResourceBuilder } from '../domain/mothers/PlantResourceBuilder.js';
import { PlantTraitsBuilder } from '../domain/mothers/PlantTraitsBuilder.js';

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
      expect(doc.phenology.flowering.pollination?.types).toEqual([
        PollinationType.INSECT
      ]);
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

    it('should store only the image resource of a minimal knowledge', () => {
      const plant = PlantFactory.create();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.knowledge).toEqual({
        resources: plant.knowledge.resources
      });
    });

    it('should include knowledge when present', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);

      expect(doc.knowledge).toBeDefined();
    });

    it('should map deletedAt correctly', () => {
      const plant = PlantFactory.create();
      plant.markAsDeleted('test-user');

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

      expect(restored.id).toBe(plant.id);
      expect(restored.identity.name.primary).toBe(plant.identity.name.primary);
    });

    it('should keep ecological traits through the document', () => {
      const plant = PlantFactory.create({
        traits: PlantTraitsBuilder.potato()
      });

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(doc.traits.ecological).toEqual({ edible: true, toxic: true });
      expect(restored.traits.ecological).toEqual({ edible: true, toxic: true });
    });

    it('should map pollination correctly', () => {
      const plant = PlantFactory.full();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.phenology.flowering.pollination).toBeDefined();
      expect(restored.phenology.flowering.pollination?.types).toEqual([
        PollinationType.INSECT
      ]);
    });

    it('should handle missing pollination', () => {
      const plant = PlantFactory.lettuce();

      const doc = plantPersistenceMapper.toMongoDocument(plant);
      const restored = plantPersistenceMapper.fromMongoDocument(doc);

      expect(restored.phenology.flowering.pollination).toBeUndefined();
    });

    it('should map deletedAt correctly', () => {
      const plant = PlantFactory.create();
      plant.markAsDeleted('test-user');

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

    it.each([
      ['has no knowledge', { knowledge: {} }],
      [
        'has no image resource',
        { knowledge: { resources: [PlantResourceBuilder.article()] } }
      ]
    ])(
      'should fail as a server error, not a client one, when the stored plant %s',
      (_case, broken) => {
        const document = {
          ...plantPersistenceMapper.toMongoDocument(PlantFactory.create()),
          ...broken
        };

        expect(() =>
          plantPersistenceMapper.fromMongoDocument(document)
        ).toThrow(InternalServerError);
      }
    );
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
