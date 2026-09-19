import { bedDomainMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import { BedFactory } from '../domain/mothers/BedFactory.js';

describe('bedDomainMapper', () => {
  describe('toPrimitives', () => {
    it('should map Bed to primitives correctly', () => {
      const bed = BedFactory.create();

      const primitives = bedDomainMapper.toPrimitives(bed);

      expect(primitives.id).toBe(bed.id.value);
      expect(primitives.userId).toBe(bed.userId.value);
      expect(primitives.name).toBe(bed.name.value);
      expect(primitives.width).toBe(bed.width.value);
      expect(primitives.height).toBe(bed.height.value);
      expect(primitives.depth).toBe(bed.depth.value);

      expect(primitives.deleted).toBe(bed.isDeleted);

      expect(primitives.metadata).toEqual(bed.metadata.toPrimitives());
    });

    it('should map plant instances to primitives', () => {
      const bed = BedFactory.random();

      const primitives = bedDomainMapper.toPrimitives(bed);

      expect(primitives.plantInstances).toHaveLength(bed.plantInstances.length);

      expect(primitives.plantInstances[0]).toMatchObject(
        bed.plantInstances[0]!.toPrimitives()
      );
    });

    it('should include deletedAt when present', () => {
      const bed = BedFactory.randomDeleted();

      const primitives = bedDomainMapper.toPrimitives(bed);

      expect(primitives.deletedAt).toBeDefined();
      expect(primitives.deleted).toBe(true);
    });

    it('should omit deletedAt when not present', () => {
      const bed = BedFactory.create();

      const primitives = bedDomainMapper.toPrimitives(bed);

      expect(primitives.deletedAt).toBeUndefined();
    });
  });

  describe('fromPrimitives', () => {
    it('should map primitives to Bed domain entity correctly', () => {
      const original = BedFactory.create();

      const primitives = bedDomainMapper.toPrimitives(original);

      const bed = bedDomainMapper.fromPrimitives(primitives);

      expect(bed.id.value).toBe(primitives.id);
      expect(bed.userId.value).toBe(primitives.userId);
      expect(bed.name.value).toBe(primitives.name);

      expect(bed.width.value).toBe(primitives.width);
      expect(bed.height.value).toBe(primitives.height);
      expect(bed.depth.value).toBe(primitives.depth);

      expect(bed.isDeleted).toBe(primitives.deleted);
    });

    it('should restore plant instances correctly', () => {
      const original = BedFactory.random();

      const primitives = bedDomainMapper.toPrimitives(original);

      const bed = bedDomainMapper.fromPrimitives(primitives);

      expect(bed.plantInstances).toHaveLength(primitives.plantInstances.length);
    });

    it('should restore deletedAt correctly', () => {
      const original = BedFactory.randomDeleted();

      const primitives = bedDomainMapper.toPrimitives(original);

      const bed = bedDomainMapper.fromPrimitives(primitives);

      expect(bed.deletedAt).toBeDefined();
      expect(bed.isDeleted).toBe(true);
    });

    it('should be reversible', () => {
      const original = BedFactory.randomDeleted();

      const primitives = bedDomainMapper.toPrimitives(original);

      const restored = bedDomainMapper.fromPrimitives(primitives);

      const restoredPrimitives = bedDomainMapper.toPrimitives(restored);

      expect(restoredPrimitives).toMatchObject(primitives);
    });
  });
});
