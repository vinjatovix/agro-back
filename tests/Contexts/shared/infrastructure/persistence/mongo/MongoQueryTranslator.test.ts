import { Binary } from 'bson';

import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoQueryTranslator } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoQueryTranslator.js';
import { random } from '../../../fixtures/random.js';

describe('MongoQueryTranslator', () => {
  describe('toMongo', () => {
    it('should return empty object when filter is undefined', () => {
      const result = MongoQueryTranslator.toMongo();
      expect(result).toEqual({});
    });

    it('should translate eq operator', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { eq: 'rosaceae' }
      });

      expect(result).toEqual({
        name: 'rosaceae'
      });
    });

    it('should translate contains operator', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { contains: 'rose' }
      });

      expect(result).toEqual({
        name: {
          $regex: 'rose',
          $options: 'i'
        }
      });
    });

    it('should translate startsWith operator', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { startsWith: 'ros' }
      });

      expect(result).toEqual({
        name: {
          $regex: '^ros',
          $options: 'i'
        }
      });
    });

    it('should translate endsWith operator', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { endsWith: 'aceae' }
      });

      expect(result).toEqual({
        name: {
          $regex: 'aceae$',
          $options: 'i'
        }
      });
    });

    it('should translate in operator', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { in: ['rosaceae', 'lamiaceae'] }
      });

      expect(result).toEqual({
        name: {
          $in: ['rosaceae', 'lamiaceae']
        }
      });
    });

    it('should translate has operator', () => {
      const result = MongoQueryTranslator.toMongo({
        aliases: { has: 'rose family' }
      });

      expect(result).toEqual({
        aliases: {
          $elemMatch: { $eq: 'rose family' }
        }
      });
    });

    it('should translate hasAny operator', () => {
      const result = MongoQueryTranslator.toMongo({
        aliases: { hasAny: ['rose', 'flower'] }
      });

      expect(result).toEqual({
        aliases: {
          $in: ['rose', 'flower']
        }
      });
    });

    it('should translate number operators', () => {
      const result = MongoQueryTranslator.toMongo({
        count: { gt: 10, lt: 20 }
      });

      expect(result).toEqual({
        count: { $gt: 10, $lt: 20 }
      });
    });

    it('should ignore empty conditions', () => {
      const result = MongoQueryTranslator.toMongo({
        name: undefined,
        aliases: { has: undefined },
        count: { gt: undefined }
      });

      expect(result).toEqual({});
    });

    it('should combine multiple fields', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { contains: 'rose' },
        slug: { eq: 'rosaceae' }
      });

      expect(result).toEqual({
        name: {
          $regex: 'rose',
          $options: 'i'
        },
        slug: 'rosaceae'
      });
    });

    it('should map id field to _id', () => {
      const result = MongoQueryTranslator.toMongo({
        id: { eq: '123' }
      });

      expect(result).toEqual({
        _id: '123'
      });
    });

    it('should prioritize eq over other operators', () => {
      const result = MongoQueryTranslator.toMongo({
        name: {
          eq: 'rose',
          contains: 'ros'
        }
      });

      expect(result).toEqual({
        name: 'rose'
      });
    });

    it('should handle complex mixed filters', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { contains: 'rose' },
        count: { gt: 5, lte: 10 },
        slug: { eq: 'rosaceae' }
      });

      expect(result).toEqual({
        name: {
          $regex: 'rose',
          $options: 'i'
        },
        count: {
          $gt: 5,
          $lte: 10
        },
        slug: 'rosaceae'
      });
    });
  });

  describe('text operators escape special characters', () => {
    const SPECIAL_CHARACTERS = [
      '.',
      '*',
      '+',
      '?',
      '^',
      '$',
      '{',
      '}',
      '(',
      ')',
      '|',
      '[',
      ']',
      '\\'
    ];

    it.each(SPECIAL_CHARACTERS)('should escape "%s" in contains', (char) => {
      const result = MongoQueryTranslator.toMongo({
        name: { contains: char }
      });

      expect(result).toEqual({ name: { $regex: `\\${char}`, $options: 'i' } });
    });

    it.each(SPECIAL_CHARACTERS)(
      'should escape "%s" in startsWith and anchor after it',
      (char) => {
        const result = MongoQueryTranslator.toMongo({
          name: { startsWith: char }
        });

        expect(result).toEqual({
          name: { $regex: `^\\${char}`, $options: 'i' }
        });
      }
    );

    it.each(SPECIAL_CHARACTERS)(
      'should escape "%s" in endsWith and anchor after it',
      (char) => {
        const result = MongoQueryTranslator.toMongo({
          name: { endsWith: char }
        });

        expect(result).toEqual({
          name: { $regex: `\\${char}$`, $options: 'i' }
        });
      }
    );

    it.each([
      ['contains', { contains: '.*' }, '\\.\\*'],
      ['startsWith', { startsWith: '^S' }, '^\\^S'],
      ['endsWith', { endsWith: '$' }, '\\$$'],
      [
        'contains (nested repetition)',
        { contains: '(a+)+$' },
        '\\(a\\+\\)\\+\\$'
      ]
    ])('should match %s input literally', (_operator, condition, expected) => {
      const result = MongoQueryTranslator.toMongo({ name: condition });

      expect(result).toEqual({ name: { $regex: expected, $options: 'i' } });
    });

    it('should turn a numeric contains value into text', () => {
      const result = MongoQueryTranslator.toMongo({
        name: { contains: 123 }
      });

      expect(result).toEqual({ name: { $regex: '123', $options: 'i' } });
    });

    it.each([
      ['contains', 'ros', 'ros'],
      ['startsWith', 'sol', '^sol'],
      ['endsWith', 'ACEAE', 'ACEAE$'],
      ['contains', 'Ñ', 'Ñ']
    ])(
      'should keep ordinary %s text "%s" unchanged',
      (operator, value, expected) => {
        const result = MongoQueryTranslator.toMongo({
          name: { [operator]: value }
        });

        expect(result).toEqual({ name: { $regex: expected, $options: 'i' } });
      }
    );
  });

  describe('identifier conversion', () => {
    it.each([
      ['contains', (id: string) => id],
      ['startsWith', (id: string) => `^${id}`]
    ])('should keep a UUID in %s as text', (operator, toPattern) => {
      const id = random.uuid();

      const result = MongoQueryTranslator.toMongo({
        slug: { [operator]: id }
      });

      expect(result).toEqual({
        slug: { $regex: toPattern(id), $options: 'i' }
      });
    });

    it('should convert a UUID in eq to a Mongo id', () => {
      const id = random.uuid();

      const result = MongoQueryTranslator.toMongo({ id: { eq: id } });

      expect(result).toEqual({ _id: toMongoId(id) });
      expect(result._id).toBeInstanceOf(Binary);
    });

    it('should convert every UUID in in to a Mongo id', () => {
      const ids = [random.uuid(), random.uuid()];

      const result = MongoQueryTranslator.toMongo({ id: { in: ids } });

      expect(result).toEqual({ _id: { $in: ids.map((id) => toMongoId(id)) } });
    });
  });
});
