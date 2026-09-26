import { FamilyQueryParser } from '../../../../src/apps/agroApi/query/FamilyQueryParser.js';

describe('FamilyQueryParser', () => {
  it('parses raw query dictionary into ListFamiliesDto containing QueryOptions', () => {
    const parser = new FamilyQueryParser();
    const query = {
      filter: {
        slug: {
          eq: 'solanaceae'
        }
      },
      sort: '{"name":"desc"}',
      pagination: {
        page: '3',
        limit: '10'
      }
    };

    const result = parser.parse(query);

    expect(result).toEqual({
      query: {
        filter: {
          slug: {
            eq: 'solanaceae'
          }
        },
        sort: { name: 'desc' },
        include: [],
        pagination: {
          page: 3,
          limit: 10
        }
      }
    });
  });

  it('provides default pagination and empty filters when empty query dictionary is given', () => {
    const parser = new FamilyQueryParser();
    const query = {};

    const result = parser.parse(query);

    expect(result).toEqual({
      query: {
        filter: {},
        sort: {},
        include: [],
        pagination: {
          page: 1,
          limit: 25
        }
      }
    });
  });
});
