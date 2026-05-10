// QueryParserUtils.spec.ts

import { QueryParserUtils } from '../../../../src/shared/domain/query/QueryParserUtils.js';

describe('QueryParserUtils', () => {
  describe('parseCsv', () => {
    it('should parse a csv string correctly', () => {
      const result = QueryParserUtils.parseCsv('name,email,age');

      expect(result).toEqual(['name', 'email', 'age']);
    });

    it('should trim spaces and remove empty values', () => {
      const result = QueryParserUtils.parseCsv(' name , , email , age ,, ');

      expect(result).toEqual(['name', 'email', 'age']);
    });

    it('should return an empty array when value is not a string', () => {
      expect(QueryParserUtils.parseCsv(undefined)).toEqual([]);
      expect(QueryParserUtils.parseCsv(null)).toEqual([]);
      expect(QueryParserUtils.parseCsv(123)).toEqual([]);
      expect(QueryParserUtils.parseCsv({})).toEqual([]);
    });
  });

  describe('toNumber', () => {
    it('should return the number when value is valid', () => {
      expect(QueryParserUtils.toNumber(10, 0)).toBe(10);
      expect(QueryParserUtils.toNumber('20', 0)).toBe(20);
      expect(QueryParserUtils.toNumber('15.5', 0)).toBe(15.5);
    });

    it('should return fallback when value is invalid', () => {
      expect(QueryParserUtils.toNumber('abc', 99)).toBe(99);
      expect(QueryParserUtils.toNumber(undefined, 99)).toBe(99);
      expect(QueryParserUtils.toNumber(null, 99)).toBe(99);
      expect(QueryParserUtils.toNumber(NaN, 99)).toBe(99);
    });
  });

  describe('parseSort', () => {
    it('should parse a valid sort object from JSON string', () => {
      const result = QueryParserUtils.parseSort(
        '{"name":"asc","createdAt":"desc"}'
      );

      expect(result).toEqual({
        name: 'asc',
        createdAt: 'desc'
      });
    });

    it('should return the object when it is already valid', () => {
      const value = {
        name: 'asc',
        createdAt: 'desc'
      };

      const result = QueryParserUtils.parseSort(value);

      expect(result).toEqual(value);
    });

    it('should return undefined for invalid JSON string', () => {
      const result = QueryParserUtils.parseSort('{invalid json}');

      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid sort values', () => {
      expect(
        QueryParserUtils.parseSort({
          name: 'ascending'
        })
      ).toBeUndefined();

      expect(
        QueryParserUtils.parseSort({
          name: 1
        })
      ).toBeUndefined();

      expect(QueryParserUtils.parseSort(null)).toBeUndefined();
      expect(QueryParserUtils.parseSort(undefined)).toBeUndefined();
      expect(QueryParserUtils.parseSort('')).toBeUndefined();
    });

    it('should accept empty objects', () => {
      const result = QueryParserUtils.parseSort({});

      expect(result).toEqual({});
    });
  });

  describe('parseInclude', () => {
    it('should parse include values from csv string', () => {
      const result = QueryParserUtils.parseInclude('profile,posts,comments');

      expect(result).toEqual(['profile', 'posts', 'comments']);
    });

    it('should parse include values from array', () => {
      const result = QueryParserUtils.parseInclude(['profile', 123, true]);

      expect(result).toEqual(['profile', '123', 'true']);
    });

    it('should return undefined for invalid values', () => {
      expect(QueryParserUtils.parseInclude(undefined)).toBeUndefined();
      expect(QueryParserUtils.parseInclude(null)).toBeUndefined();
      expect(QueryParserUtils.parseInclude(123)).toBeUndefined();
      expect(QueryParserUtils.parseInclude({})).toBeUndefined();
    });

    it('should return an empty array when csv string is empty', () => {
      const result = QueryParserUtils.parseInclude(' , , ');

      expect(result).toEqual([]);
    });
  });
});
