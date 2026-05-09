import { MongoQueryTranslator } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoQueryTranslator.js';

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

    it('should translate includes operator', () => {
      const result = MongoQueryTranslator.toMongo({
        aliases: { includes: 'rose family' }
      });

      expect(result).toEqual({
        aliases: {
          $elemMatch: { $eq: 'rose family' }
        }
      });
    });

    it('should translate includesSome operator', () => {
      const result = MongoQueryTranslator.toMongo({
        aliases: { includesSome: ['rose', 'flower'] }
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
        aliases: { includes: undefined },
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

    // 🔥 NUEVO: multiple fields stress
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
});
