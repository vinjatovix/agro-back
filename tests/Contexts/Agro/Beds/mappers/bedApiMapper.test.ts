import { bedApiMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedApiMapper.js';
import { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import { UuidMother } from '../../../../Contexts/shared/fixtures/UuidMother.js';
import { CreateBedInputMother } from '../application/mothers/CreateBedInputMother.js';
import { UpdateBedInputMother } from '../application/mothers/UpdateBedInputMother.js';

describe('bedApiMapper', () => {
  describe('fromCreateInputToDomain', () => {
    it('should map create input to Bed domain entity', () => {
      const input = CreateBedInputMother.random();

      const bed = bedApiMapper.fromCreateInputToDomain(input, 'tester');

      expect(bed).toBeInstanceOf(Bed);
      expect(bed.id.value).toBe(input.id);
      expect(bed.userId.value).toBe(input.userId);
      expect(bed.name.value).toBe(input.name);
      expect(bed.width.value).toBe(input.width);
      expect(bed.height.value).toBe(input.height);
      expect(bed.depth.value).toBe(input.depth);
      expect(bed.isDeleted).toBe(false);
      expect(bed.deletedAt).toBeUndefined();
      expect(bed.plantInstances).toEqual([]);
      expect(bed.metadata.createdBy).toBe('tester');
    });

    it('should create metadata correctly', () => {
      const input = CreateBedInputMother.random();

      const bed = bedApiMapper.fromCreateInputToDomain(input, 'john');

      expect(bed.metadata.createdAt).toBeInstanceOf(Date);
      expect(bed.metadata.updatedAt).toBeInstanceOf(Date);
      expect(bed.metadata.createdBy).toBe('john');
      expect(bed.metadata.updatedBy).toBe('john');
    });

    it('should throw if numeric values are invalid', () => {
      const input = CreateBedInputMother.random({ width: -1 });

      expect(() =>
        bedApiMapper.fromCreateInputToDomain(input, 'tester')
      ).toThrow();
    });
  });

  describe('fromUpdateInputToPrimitivesPatch', () => {
    it('should map full update input to patch', () => {
      const input = UpdateBedInputMother.random();
      const patch = bedApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch).toEqual({
        id: input.id,
        name: input.name,
        width: input.width,
        height: input.height,
        depth: input.depth
      });
    });

    it('should include only provided fields', () => {
      const input = {
        id: UuidMother.random().value,
        width: 300
      };

      const patch = bedApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch).toEqual({
        id: input.id,
        width: 300
      });

      expect(patch).not.toHaveProperty('name');
      expect(patch).not.toHaveProperty('height');
      expect(patch).not.toHaveProperty('depth');
    });

    it('should always include id', () => {
      const input = {
        id: UuidMother.random().value
      };

      const patch = bedApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch.id).toBe(input.id);
    });

    it('should throw when invalid width is provided', () => {
      const input = UpdateBedInputMother.random({ width: -50 });
      expect(() =>
        bedApiMapper.fromUpdateInputToPrimitivesPatch(input)
      ).toThrow();
    });

    it('should throw when invalid uuid is provided', () => {
      const input = {
        id: 'invalid-uuid'
      };

      expect(() =>
        bedApiMapper.fromUpdateInputToPrimitivesPatch(input)
      ).toThrow();
    });
  });
});
