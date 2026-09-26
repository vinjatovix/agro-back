import { QueryParserUtils } from '../../../../src/apps/agroApi/query/QueryParserUtils.js';

describe('QueryParserUtils', () => {
  describe('parseCsv', () => {
    it('parses comma-separated values into a string array', () => {
      const input = 'name,email,age';

      const result = QueryParserUtils.parseCsv(input);

      expect(result).toEqual(['name', 'email', 'age']);
    });

    it('trims whitespace and ignores empty entries', () => {
      const input = ' name , , email , age ,, ';

      const result = QueryParserUtils.parseCsv(input);

      expect(result).toEqual(['name', 'email', 'age']);
    });

    it.each([undefined, null, 123, {}, []])(
      'returns an empty array when input is not a string (%p)',
      (input) => {
        const result = QueryParserUtils.parseCsv(input);

        expect(result).toEqual([]);
      }
    );
  });

  describe('toNumber', () => {
    it.each([
      [10, 0, 10],
      ['20', 0, 20],
      ['15.5', 0, 15.5]
    ])(
      'returns parsed numeric value for valid input %p',
      (input, fallback, expected) => {
        const result = QueryParserUtils.toNumber(input, fallback);

        expect(result).toBe(expected);
      }
    );

    it.each([
      ['abc', 99],
      [undefined, 99],
      [null, 99],
      [Number.NaN, 99],
      [{}, 99]
    ])(
      'returns fallback value %p for non-numeric input %p',
      (input, fallback) => {
        const result = QueryParserUtils.toNumber(input, fallback);

        expect(result).toBe(fallback);
      }
    );
  });

  describe('coerce', () => {
    it.each([
      ['123', 123],
      ['45.67', 45.67],
      ['-5', -5],
      ['0', 0]
    ])('coerces numeric string %p to number %p', (input, expected) => {
      const result = QueryParserUtils.coerce(input);

      expect(result).toBe(expected);
    });

    it.each([
      ['true', true],
      ['false', false]
    ])('coerces boolean string %p to boolean %p', (input, expected) => {
      const result = QueryParserUtils.coerce(input);

      expect(result).toBe(expected);
    });

    it.each([
      ['hello', 'hello'],
      ['', '']
    ])(
      'preserves non-numeric string %p without coercion',
      (input, expected) => {
        const result = QueryParserUtils.coerce(input);

        expect(result).toBe(expected);
      }
    );
  });

  describe('parseSort', () => {
    it('parses valid sort JSON string into SortOptions dictionary', () => {
      const input = '{"name":"asc","createdAt":"desc"}';

      const result = QueryParserUtils.parseSort(input);

      expect(result).toEqual({
        name: 'asc',
        createdAt: 'desc'
      });
    });

    it('returns SortOptions directly when input is already a valid object', () => {
      const input = { name: 'asc' as const, createdAt: 'desc' as const };

      const result = QueryParserUtils.parseSort(input);

      expect(result).toEqual(input);
    });

    it('returns empty object when given an empty object', () => {
      const input = {};

      const result = QueryParserUtils.parseSort(input);

      expect(result).toEqual({});
    });

    it.each([
      '{invalid json}',
      '{"name":"ascending"}',
      { name: 'ascending' },
      { name: 1 },
      null,
      undefined,
      '',
      123
    ])('returns undefined for invalid sort input %p', (input) => {
      const result = QueryParserUtils.parseSort(input);

      expect(result).toBeUndefined();
    });
  });

  describe('parseInclude', () => {
    it('parses CSV string into string array', () => {
      const input = 'profile,posts,comments';

      const result = QueryParserUtils.parseInclude(input);

      expect(result).toEqual(['profile', 'posts', 'comments']);
    });

    it('converts array items to string array', () => {
      const input = ['profile', 123, true];

      const result = QueryParserUtils.parseInclude(input);

      expect(result).toEqual(['profile', '123', 'true']);
    });

    it('returns empty array when CSV string has only whitespace and commas', () => {
      const input = ' , , ';

      const result = QueryParserUtils.parseInclude(input);

      expect(result).toEqual([]);
    });

    it.each([undefined, null, 123, {}])(
      'returns undefined for invalid include input %p',
      (input) => {
        const result = QueryParserUtils.parseInclude(input);

        expect(result).toBeUndefined();
      }
    );
  });
});
