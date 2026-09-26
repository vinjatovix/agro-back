import { PlantQueryParser } from '../../../../src/apps/agroApi/query/PlantQueryParser.js';

describe('PlantQueryParser', () => {
  it('parses raw query dictionary into ListPlantsDto containing QueryOptions', () => {
    const parser = new PlantQueryParser();
    const query = {
      filter: {
        name: {
          contains: 'tomato'
        }
      },
      sort: '{"name":"asc"}',
      pagination: {
        page: '2',
        limit: '15'
      }
    };

    const result = parser.parse(query);

    expect(result).toEqual({
      query: {
        filter: {
          name: {
            contains: 'tomato'
          }
        },
        sort: { name: 'asc' },
        include: [],
        pagination: {
          page: 2,
          limit: 15
        }
      }
    });
  });

  it('provides default pagination and empty filters when empty query dictionary is given', () => {
    const parser = new PlantQueryParser();
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
