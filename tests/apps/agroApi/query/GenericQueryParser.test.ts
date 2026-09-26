import { GenericQueryParser } from '../../../../src/apps/agroApi/query/GenericQueryParser.js';

describe('GenericQueryParser', () => {
  const baseResult = {
    sort: {},
    include: [],
    pagination: {
      page: 1,
      limit: 25
    }
  };

  describe('exact filter parsing', () => {
    it('parses string eq filter', () => {
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

    it.each([
      ['true', true],
      ['false', false],
      ['123', 123],
      ['hello', 'hello']
    ])('coerces eq scalar value %p to %p', (rawValue, expectedValue) => {
      const query = {
        filter: {
          active: {
            eq: rawValue
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          active: {
            eq: expectedValue
          }
        }
      });
    });
  });

  describe('string filter operators', () => {
    it.each([
      ['contains', 'sol', 'sol'],
      ['startsWith', 'sol', 'sol'],
      ['endsWith', 'aceae', 'aceae']
    ])(
      'parses string operator %s with value %p',
      (operator, rawValue, expectedValue) => {
        const query = {
          filter: {
            name: {
              [operator]: rawValue
            }
          }
        };

        const result = GenericQueryParser.parse(query);

        expect(result).toEqual({
          ...baseResult,
          filter: {
            name: {
              [operator]: expectedValue
            }
          }
        });
      }
    );
  });

  describe('array filter operators', () => {
    it('parses has operator with comma-separated values', () => {
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

    it('parses hasAny operator with comma-separated values', () => {
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

    it('parses array filter when value is already an array of strings', () => {
      const query = {
        filter: {
          aliases: {
            hasAny: ['alpha', 'beta']
          }
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
        ...baseResult,
        filter: {
          aliases: {
            hasAny: ['alpha', 'beta']
          }
        }
      });
    });
  });

  describe('numeric filter operators', () => {
    it.each([
      ['gt', '3', 3],
      ['gte', '5', 5],
      ['lt', '10', 10],
      ['lte', '20', 20]
    ])(
      'parses numeric operator %s with value %p to number %p',
      (operator, rawValue, expectedValue) => {
        const query = {
          filter: {
            growthDays: {
              [operator]: rawValue
            }
          }
        };

        const result = GenericQueryParser.parse(query);

        expect(result).toEqual({
          ...baseResult,
          filter: {
            growthDays: {
              [operator]: expectedValue
            }
          }
        });
      }
    );
  });

  describe('combined query parsing', () => {
    it('parses combined filter, sort, include, and pagination options', () => {
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
        },
        sort: '{"name":"asc"}',
        include: 'family,traits',
        pagination: {
          page: '2',
          limit: '10'
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result).toEqual({
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
        },
        sort: { name: 'asc' },
        include: ['family', 'traits'],
        pagination: {
          page: 2,
          limit: 10
        }
      });
    });
  });

  describe('pagination defaults and normalization', () => {
    it('applies default pagination when query has no pagination options', () => {
      const result = GenericQueryParser.parse({});

      expect(result.pagination).toEqual({
        page: 1,
        limit: 25
      });
    });

    it.each([
      [
        { page: '3', limit: '50' },
        { page: 3, limit: 50 }
      ],
      [
        { page: 4, limit: 100 },
        { page: 4, limit: 100 }
      ]
    ])(
      'normalizes pagination %p to %p',
      (paginationInput, expectedPagination) => {
        const query = { pagination: paginationInput };

        const result = GenericQueryParser.parse(query);

        expect(result.pagination).toEqual(expectedPagination);
      }
    );
  });

  describe('edge cases and malformed query rejection (HTTP 400)', () => {
    it('ignores non-object filter parameter', () => {
      const query = { filter: 'Asteraceae' };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });

    it('ignores non-object field operators', () => {
      const query = {
        filter: {
          name: 'invalidOperator'
        }
      };

      const result = GenericQueryParser.parse(query);

      expect(result.filter).toEqual({});
    });

    it.each([
      ['name', 'eq', 123],
      ['name', 'eq', {}],
      ['name', 'contains', true],
      ['growthDays', 'gt', null]
    ])(
      'throws bad request when filter %s.%s receives non-string value %p',
      (field, operator, invalidValue) => {
        const query = {
          filter: {
            [field]: {
              [operator]: invalidValue
            }
          }
        };

        expect(() => GenericQueryParser.parse(query)).toThrow(
          `Invalid value for filter '${field}.${operator}'`
        );
      }
    );

    it.each([
      ['name', 'eq', 'a,b'],
      ['name', 'eq', ['a', 'b']]
    ])(
      'throws bad request when eq operator receives array or csv values (%p)',
      (field, operator, arrayValue) => {
        const query = {
          filter: {
            [field]: {
              [operator]: arrayValue
            }
          }
        };

        expect(() => GenericQueryParser.parse(query)).toThrow(
          `Invalid eq value for field ${field}: arrays are not allowed. Use 'in' instead.`
        );
      }
    );

    it.each([
      ['aliases', 'has', ['valid', 123]],
      ['aliases', 'hasAny', ['valid', {}]]
    ])(
      'throws bad request when array filter %s.%s contains non-string items',
      (field, operator, invalidArray) => {
        const query = {
          filter: {
            [field]: {
              [operator]: invalidArray
            }
          }
        };

        expect(() => GenericQueryParser.parse(query)).toThrow(
          `Invalid array value for filter '${field}.${operator}'`
        );
      }
    );

    it.each(['-1', 0, -5, 'invalid'])(
      'throws bad request when pagination.page is <= 0 or NaN (%p)',
      (invalidPage) => {
        const query = {
          pagination: {
            page: invalidPage
          }
        };

        expect(() => GenericQueryParser.parse(query)).toThrow(
          'pagination.page must be greater than 0'
        );
      }
    );

    it.each(['-1', 0, -10, 'invalid'])(
      'throws bad request when pagination.limit is <= 0 or NaN (%p)',
      (invalidLimit) => {
        const query = {
          pagination: {
            limit: invalidLimit
          }
        };

        expect(() => GenericQueryParser.parse(query)).toThrow(
          'pagination.limit must be greater than 0'
        );
      }
    );
  });
});
