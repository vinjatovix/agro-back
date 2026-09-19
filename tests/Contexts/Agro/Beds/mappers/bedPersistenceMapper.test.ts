import { bedPersistenceMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { BedFactory } from '../domain/mothers/BedFactory.js';

describe('bedPersistenceMapper', () => {
  describe('toMongoDocument', () => {
    it('should map Bed to mongo document correctly', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.name).toBe(bed.name.value);

      expect(document.width).toBe(bed.width.value);
      expect(document.height).toBe(bed.height.value);
      expect(document.depth).toBe(bed.depth.value);

      expect(document.deleted).toBe(bed.isDeleted);

      expect(document.metadata).toEqual(bed.metadata.toPrimitives());
    });

    it('should map ids as mongo binary uuids', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document._id).toBeDefined();
      expect(document.userId).toBeDefined();
    });

    it('should map plant instances', () => {
      const bed = BedFactory.random();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.plantInstances).toHaveLength(bed.plantInstances.length);

      expect(document.plantInstances[0]).toMatchObject(
        bed.plantInstances[0]!.toPrimitives()
      );
    });

    it('should include deletedAt when present', () => {
      const bed = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.deletedAt).toBeDefined();
      expect(typeof document.deletedAt).toBe('string');
    });

    it('should omit deletedAt when absent', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.deletedAt).toBeUndefined();
    });
  });

  describe('fromMongoDocument', () => {
    it('should map mongo document to Bed correctly', () => {
      const original = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.id.value).toBe(original.id.value);
      expect(bed.userId.value).toBe(original.userId.value);

      expect(bed.name.value).toBe(original.name.value);

      expect(bed.width.value).toBe(original.width.value);
      expect(bed.height.value).toBe(original.height.value);
      expect(bed.depth.value).toBe(original.depth.value);

      expect(bed.isDeleted).toBe(original.isDeleted);
    });

    it('should restore plant instances correctly', () => {
      const original = BedFactory.random();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.plantInstances).toHaveLength(original.plantInstances.length);
    });

    it('should restore deletedAt correctly', () => {
      const original = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.deletedAt).toBeInstanceOf(Date);
      expect(bed.isDeleted).toBe(true);
    });

    it('should default plantInstances to empty array when missing', () => {
      const original = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(original);

      delete (document as Partial<typeof document>).plantInstances;

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.plantInstances).toEqual([]);
    });

    it('should be reversible', () => {
      const original = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const restored = bedPersistenceMapper.fromMongoDocument(document);

      const restoredDocument = bedPersistenceMapper.toMongoDocument(restored);

      expect(restoredDocument).toMatchObject(document);
    });
  });
});
