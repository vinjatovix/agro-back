import { GenericQueryParser } from '../../../../src/shared/domain/query/GenericQueryParser.js';

const baseResult = {
  sort: {},
  include: [],
  pagination: {
    page: 1,
    limit: 20
  }
};

describe('GenericQueryParser', () => {
  it('defaults operator to eq when not provided', () => {
    const query = {
      'filter[name]': 'Asteraceae'
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

  describe('exact filter parsing', () => {
    it('parses eq filter (default operator)', () => {
      const query = {
        'filter[name]': 'Asteraceae'
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({
        name: { eq: 'Asteraceae' }
      });
    });

    it('parses explicit eq filter', () => {
      const query = {
        'filter[name][eq]': 'Asteraceae'
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

    it('parses in operator with csv', () => {
      const query = {
        'filter[name][in]': 'Asteraceae,Solanaceae'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            in: ['Asteraceae', 'Solanaceae']
          }
        }
      });
    });
  });

  describe('string filter operators', () => {
    it('parses contains operator', () => {
      const query = {
        'filter[name][contains]': 'sol'
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
        'filter[name][startsWith]': 'sol'
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
        'filter[name][endsWith]': 'aceae'
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
    it('parses includes operator', () => {
      const query = {
        'filter[aliases][includes]': 'foo'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          aliases: {
            includes: 'foo'
          }
        }
      });
    });

    it('parses includesSome with csv', () => {
      const query = {
        'filter[aliases][includesSome]': 'a,b,c'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          aliases: {
            includesSome: ['a', 'b', 'c']
          }
        }
      });
    });
  });

  describe('numeric filters', () => {
    it('parses gt operator', () => {
      const query = {
        'filter[growthDays][gt]': '3'
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
        'filter[growthDays][gte]': '5'
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
        'filter[growthDays][lt]': '10'
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
        'filter[growthDays][lte]': '20'
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

  describe('boolean filters', () => {
    it('parses true boolean', () => {
      const query = {
        'filter[active][eq]': 'true'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          active: {
            eq: true
          }
        }
      });
    });

    it('parses false boolean', () => {
      const query = {
        'filter[active][eq]': 'false'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          active: {
            eq: false
          }
        }
      });
    });
  });

  describe('mixed filters', () => {
    it('parses multiple filter types together', () => {
      const query = {
        'filter[name][contains]': 'sol',
        'filter[slug][eq]': 'solanaceae',
        'filter[aliases][includesSome]': 'a,b',
        'filter[name][in]': 'Asteraceae,Solanaceae',
        'filter[growthDays][lt]': '3'
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          name: {
            contains: 'sol',
            in: ['Asteraceae', 'Solanaceae']
          },
          slug: {
            eq: 'solanaceae'
          },
          aliases: {
            includesSome: ['a', 'b']
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
        limit: 20
      });
    });
  });

  describe('edge cases', () => {
    it('throws when eq receives array value', () => {
      const query = {
        'filter[name]': 'a,b'
      };

      expect(() => GenericQueryParser.parse(query)).toThrow(
        /arrays are not allowed/
      );
    });

    it('ignores invalid filter keys', () => {
      const query = {
        'invalid[name][eq]': 'value'
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });

    it('ignores non-string values', () => {
      const query = {
        'filter[name][eq]': 123 as unknown
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });

    it('ignores malformed filter patterns', () => {
      const query = {
        filternameeq: 'Asteraceae'
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });
  });
});
