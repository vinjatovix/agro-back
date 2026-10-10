import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { BedName } from '../../../../../../src/Contexts/Agro/Beds/domain/BedName.js';
import { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import { bedDomainMapper } from '../../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { BedFactory } from '../mothers/BedFactory.js';

describe('Bed (unit)', () => {
  let bed: Bed;

  const BED_DIMENSION = 200;
  const BED_DEPTH = 40;
  const BED_NAME = 'Test Bed';

  beforeEach(() => {
    bed = new Bed({
      id: randomBedId(),
      userId: randomUserId(),
      name: new BedName(BED_NAME),
      width: PositiveNumber.create(BED_DIMENSION),
      height: PositiveNumber.create(BED_DIMENSION),
      depth: PositiveNumber.create(BED_DEPTH),
      metadata: Metadata.create('system'),
      deleted: false
    });
  });

  it('exposes correct dimensions and id', () => {
    expect(bed.id).toBeDefined();
    expect(bed.width.value).toBe(BED_DIMENSION);
    expect(bed.height.value).toBe(BED_DIMENSION);
    expect(bed.depth.value).toBe(BED_DEPTH);
  });

  it('starts at version 0 when no version is provided', () => {
    expect(bed.version).toBe(0);
  });

  it('marks bed as deleted', () => {
    bed.markAsDeleted('test-user');

    expect(bed.isDeleted).toBe(true);
    expect(bed.deletedAt).toBeInstanceOf(Date);
  });

  it('throws DomainConflictException when marking an already deleted bed as deleted', () => {
    bed.markAsDeleted('test-user');

    expect(() => bed.markAsDeleted('test-user')).toThrow(
      DomainConflictException
    );
  });

  describe('rename', () => {
    it('changes only name', () => {
      const original = bedDomainMapper.toPrimitives(bed);

      bed.rename('New Name', 'test-user');
      const result = bedDomainMapper.toPrimitives(bed);

      expect(result.name).toBe('New Name');
      expect(result.width).toBe(original.width);
      expect(result.height).toBe(original.height);
      expect(result.depth).toBe(original.depth);
      expect(result.id).toBe(original.id);
      expect(result.userId).toBe(original.userId);
      expect(result.version).toBe(original.version);
    });

    it('throws DomainConflictException on a soft-deleted bed', () => {
      bed.markAsDeleted('test-user');

      expect(() => bed.rename('New Name', 'test-user')).toThrow(
        DomainConflictException
      );
    });

    it('stores a padded name trimmed', () => {
      bed.rename('  New Name  ', 'test-user');

      expect(bed.name.value).toBe('New Name');
    });

    it.each([[''], ['   ']])(
      'throws InvalidArgumentException for the blank name %j',
      (name) => {
        expect(() => bed.rename(name, 'test-user')).toThrow(
          InvalidArgumentException
        );
      }
    );

    it.each([[''], ['   ']])(
      'leaves the bed unchanged when renaming to blank name %j fails',
      (name) => {
        const original = bedDomainMapper.toPrimitives(bed);

        expect(() => bed.rename(name, 'test-user')).toThrow();
        expect(bedDomainMapper.toPrimitives(bed)).toEqual(original);
      }
    );
  });

  describe('resize', () => {
    it('changes only width when given', () => {
      const original = bedDomainMapper.toPrimitives(bed);

      bed.resize({ width: 150 }, 'test-user');
      const result = bedDomainMapper.toPrimitives(bed);

      expect(result.width).toBe(150);
      expect(result.height).toBe(original.height);
      expect(result.depth).toBe(original.depth);
    });

    it('changes several dimensions at once', () => {
      bed.resize({ width: 300, height: 400, depth: 50 }, 'test-user');
      const result = bedDomainMapper.toPrimitives(bed);

      expect(result.width).toBe(300);
      expect(result.height).toBe(400);
      expect(result.depth).toBe(50);
    });

    it('throws InvalidArgumentException naming field for zero width', () => {
      const before = bedDomainMapper.toPrimitives(bed);

      expect(() => bed.resize({ width: 0 }, 'test-user')).toThrow(/width/);
      expect(bedDomainMapper.toPrimitives(bed)).toEqual(before);
    });

    it('throws InvalidArgumentException for non-finite value', () => {
      const before = bedDomainMapper.toPrimitives(bed);

      expect(() => bed.resize({ width: Number.NaN }, 'test-user')).toThrow(
        InvalidArgumentException
      );
      expect(bedDomainMapper.toPrimitives(bed)).toEqual(before);
    });

    it('is atomic and leaves bed unchanged on invalid combined input', () => {
      const before = bedDomainMapper.toPrimitives(bed);

      expect(() =>
        bed.resize({ width: 300, height: -1 }, 'test-user')
      ).toThrow();
      expect(bedDomainMapper.toPrimitives(bed)).toEqual(before);
    });

    it('throws DomainConflictException on a soft-deleted bed', () => {
      bed.markAsDeleted('test-user');

      expect(() => bed.resize({ width: 150 }, 'test-user')).toThrow(
        DomainConflictException
      );
    });

    it('does not modify id, userId, version, or metadata', () => {
      const original = bedDomainMapper.toPrimitives(bed);

      bed.resize({ width: 150 }, 'test-user');
      const result = bedDomainMapper.toPrimitives(bed);

      expect(result.id).toBe(original.id);
      expect(result.userId).toBe(original.userId);
      expect(result.version).toBe(original.version);
    });
  });

  describe('rename + resize on deleted bed', () => {
    it('rename does not modify a deleted bed', () => {
      const deletedBed = BedFactory.randomDeleted();
      const before = bedDomainMapper.toPrimitives(deletedBed);

      expect(() => deletedBed.rename('Changed', 'test-user')).toThrow(
        DomainConflictException
      );
      expect(bedDomainMapper.toPrimitives(deletedBed)).toEqual(before);
    });
  });

  describe('audit metadata', () => {
    const OLD = new Date('2024-01-01T00:00:00.000Z');
    let audited: Bed;

    beforeEach(() => {
      audited = new Bed({
        id: randomBedId(),
        userId: randomUserId(),
        name: new BedName(BED_NAME),
        width: PositiveNumber.create(BED_DIMENSION),
        height: PositiveNumber.create(BED_DIMENSION),
        depth: PositiveNumber.create(BED_DEPTH),
        metadata: Metadata.fromPrimitives({
          createdAt: OLD,
          createdBy: 'creator',
          updatedAt: OLD,
          updatedBy: 'creator'
        }),
        deleted: false
      });
    });

    const expectAuditedBy = (user: string): void => {
      expect(audited.metadata.updatedBy).toBe(user);
      expect(audited.metadata.updatedAt.getTime()).toBeGreaterThan(
        OLD.getTime()
      );
      expect(audited.metadata.createdBy).toBe('creator');
      expect(audited.metadata.createdAt).toEqual(OLD);
    };

    it('rename with a new value refreshes audit data', () => {
      audited.rename('Another name', 'editor');

      expectAuditedBy('editor');
    });

    it('rename with the same value leaves the aggregate untouched', () => {
      const metadata = audited.metadata;
      const before = bedDomainMapper.toPrimitives(audited);

      audited.rename(audited.name.value, 'editor');

      expect(audited.metadata).toBe(metadata);
      expect(bedDomainMapper.toPrimitives(audited)).toEqual(before);
    });

    it('resize with a new value refreshes audit data', () => {
      audited.resize({ depth: audited.depth.value + 1 }, 'editor');

      expectAuditedBy('editor');
    });

    it('resize with the same values leaves the aggregate untouched', () => {
      const metadata = audited.metadata;

      audited.resize(
        {
          width: audited.width.value,
          height: audited.height.value,
          depth: audited.depth.value
        },
        'editor'
      );

      expect(audited.metadata).toBe(metadata);
    });

    it('invalid resize leaves metadata untouched', () => {
      const metadata = audited.metadata;

      expect(() => audited.resize({ width: 0 }, 'editor')).toThrow(
        InvalidArgumentException
      );
      expect(audited.metadata).toBe(metadata);
    });

    it('rename on a deleted bed leaves metadata untouched', () => {
      const deleted = BedFactory.randomDeleted();
      const metadata = deleted.metadata;

      expect(() => deleted.rename('Other', 'editor')).toThrow(
        DomainConflictException
      );
      expect(deleted.metadata).toBe(metadata);
    });

    it('markAsDeleted records the deleting user at the deletion time', () => {
      audited.markAsDeleted('deleter');

      expectAuditedBy('deleter');
      expect(audited.metadata.updatedAt).toBe(audited.deletedAt);
    });
  });

  describe('syncVersion', () => {
    it.each([
      ['written', 1],
      ['unchanged', 0]
    ] as const)(
      'applies a %s outcome as the current version + %i without touching metadata',
      (outcome, step) => {
        const metadata = bed.metadata;

        bed.syncVersion(outcome);

        expect(bed.version).toBe(step);
        expect(bed.metadata).toBe(metadata);
      }
    );
  });
});
