import type { UpdateBedInput } from '../../../../../src/Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedInput.js';
import { Bed } from '../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import { bedInputMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedInputMapper.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { CreateBedInputMother } from '../application/mothers/CreateBedInputMother.js';
import { UpdateBedInputMother } from '../application/mothers/UpdateBedInputMother.js';

describe('bedInputMapper', () => {
  describe('fromCreateInputToDomain', () => {
    it('should map create input to Bed domain entity', () => {
      const input = CreateBedInputMother.random();

      const bed = bedInputMapper.fromCreateInputToDomain(input, 'tester');

      expect(bed).toBeInstanceOf(Bed);
      expect(bed.id).toBe(input.id);
      expect(bed.userId).toBe(input.userId);
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

      const bed = bedInputMapper.fromCreateInputToDomain(input, 'john');

      expect(bed.metadata.createdAt).toBeInstanceOf(Date);
      expect(bed.metadata.updatedAt).toBeInstanceOf(Date);
      expect(bed.metadata.createdBy).toBe('john');
      expect(bed.metadata.updatedBy).toBe('john');
    });

    it('should throw if numeric values are invalid', () => {
      const input = CreateBedInputMother.random({ width: -1 });

      expect(() =>
        bedInputMapper.fromCreateInputToDomain(input, 'tester')
      ).toThrow();
    });
  });

  describe('toChanges', () => {
    it('maps { name, dimensions } for a full input', () => {
      const input = UpdateBedInputMother.random();
      const changes = bedInputMapper.toChanges(input);

      expect(changes.name).toBe(input.name);
      expect(changes.dimensions.width).toBe(input.width);
      expect(changes.dimensions.height).toBe(input.height);
      expect(changes.dimensions.depth).toBe(input.depth);
    });

    it('carries only provided dimension fields', () => {
      const input: UpdateBedInput = { id: random.uuid(), width: 300 };
      const changes = bedInputMapper.toChanges(input);

      expect(changes.dimensions.width).toBe(300);
      expect(changes.dimensions.height).toBeUndefined();
      expect(changes.dimensions.depth).toBeUndefined();
    });

    it('passes a zero width through without validation', () => {
      const input: UpdateBedInput = { id: random.uuid(), width: 0 };
      const changes = bedInputMapper.toChanges(input);

      expect(changes.dimensions.width).toBe(0);
    });

    it('does not include id, userId, or plantInstances', () => {
      const input = UpdateBedInputMother.random();
      const changes = bedInputMapper.toChanges(input);

      expect(changes).not.toHaveProperty('id');
      expect(changes).not.toHaveProperty('userId');
      expect(changes).not.toHaveProperty('plantInstances');
    });
  });
});
