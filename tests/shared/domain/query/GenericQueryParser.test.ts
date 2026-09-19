import { GenericQueryParser } from '../../../../src/shared/domain/query/GenericQueryParser.js';

const baseResult = {
  sort: {},
  include: [],
  pagination: {
    page: 1,
    limit: 25
  }
};

describe('GenericQueryParser', () => {
  describe('exact filter parsing', () => {
    it('parses eq filter', () => {
      const query = {
        filter: {
          name: {
            eq: 'Asteraceae'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            eq: 'Asteraceae'
          }
        }
      });
    });

    it('parses has operator with csv', () => {
      const query = {
        filter: {
          name: {
            has: 'Asteraceae,Solanaceae'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            has: ['Asteraceae', 'Solanaceae']
          }
        }
      });
    });
  });

  describe('string filter operators', () => {
    it('parses contains operator', () => {
      const query = {
        filter: {
          name: {
            contains: 'sol'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            contains: 'sol'
          }
        }
      });
    });

    it('parses startsWith operator', () => {
      const query = {
        filter: {
          name: {
            startsWith: 'sol'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            startsWith: 'sol'
          }
        }
      });
    });

    it('parses endsWith operator', () => {
      const query = {
        filter: {
          name: {
            endsWith: 'aceae'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            endsWith: 'aceae'
          }
        }
      });
    });
  });

  describe('array filter operators', () => {
    it('parses hasAny operator with csv', () => {
      const query = {
        filter: {
          aliases: {
            hasAny: 'a,b,c'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          aliases: {
            hasAny: ['a', 'b', 'c']
          }
        }
      });
    });
  });

  describe('numeric filters', () => {
    it('parses gt operator', () => {
      const query = {
        filter: {
          growthDays: {
            gt: '3'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          growthDays: {
            gt: 3
          }
        }
      });
    });

    it('parses gte operator', () => {
      const query = {
        filter: {
          growthDays: {
            gte: '5'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          growthDays: {
            gte: 5
          }
        }
      });
    });

    it('parses lt operator', () => {
      const query = {
        filter: {
          growthDays: {
            lt: '10'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          growthDays: {
            lt: 10
          }
        }
      });
    });

    it('parses lte operator', () => {
      const query = {
        filter: {
          growthDays: {
            lte: '20'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          growthDays: {
            lte: 20
          }
        }
      });
    });
  });

  describe('mixed filters', () => {
    it('parses multiple filter types together', () => {
      const query = {
        filter: {
          name: {
            contains: 'sol',
            has: 'Asteraceae,Solanaceae'
          },
          slug: {
            eq: 'solanaceae'
          },
          aliases: {
            hasAny: 'a,b'
          },
          growthDays: {
            lt: '3'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            contains: 'sol',
            has: ['Asteraceae', 'Solanaceae']
          },
          slug: {
            eq: 'solanaceae'
          },
          aliases: {
            hasAny: ['a', 'b']
          },
          growthDays: {
            lt: 3
          }
        }
      });
    });
  });

  describe('pagination parsing', () => {
    it('parses pagination correctly', () => {
      const query = {
        pagination: {
          page: '2',
          limit: '10'
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10
      });
    });

    it('applies default pagination', () => {
      const result = GenericQueryParser.parse({});

      expect(result.pagination).toEqual({
        page: 1,
        limit: 25
      });
    });
  });

  describe('edge cases', () => {
    it('throws when eq receives array value', () => {
      const query = {
        filter: {
          name: {
            eq: 'a,b'
          }
        }
      };

      expect(() => GenericQueryParser.parse(query)).toThrow(
        /arrays are not allowed/
      );
    });

    it('ignores invalid filter keys', () => {
      const query = {
        invalid: {
          name: {
            eq: 'value'
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });

    it('throws when eq receives non-string value', () => {
      const query = {
        filter: {
          name: {
            eq: 123 as unknown
          }
        }
      };

      expect(() => GenericQueryParser.parse(query)).toThrow(
        "Invalid value for filter 'name.eq'"
      );
    });

    it('ignores malformed filter values', () => {
      const query = {
        filter: 'Asteraceae' as unknown
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });
  });
});
