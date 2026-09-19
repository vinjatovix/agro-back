import type { FamilyFilter } from '../../../../domain/types/FamilyFilter.js';

type MongoQuery = Record<string, unknown>;
type MapperFn = (filter: FamilyFilter, query: MongoQuery) => void;

export class FamilyQueryMapper {
  private static readonly mappers: MapperFn[] = [
    (filter, query) => {
      if (filter.id?.eq) {
        query['_id'] = {
          $in: Array.isArray(filter.id.eq) ? filter.id.eq : [filter.id.eq]
        };
      }
    },

    (filter, query) => {
      if (filter.slug?.contains) {
        query['slug'] = {
          $regex: filter.slug.contains,
          $options: 'i'
        };
      }
    },

    (filter, query) => {
      if (filter.name?.contains) {
        query['name'] = {
          $regex: filter.name.contains,
          $options: 'i'
        };
      }
    },

    (filter, query) => {
      if (filter.scientificName?.contains) {
        query['scientificName'] = {
          $regex: filter.scientificName.contains,
          $options: 'i'
        };
      }
    },

    (filter, query) => {
      if (filter.aliases?.hasAny) {
        query['aliases'] = {
          $in: filter.aliases.hasAny
        };
      }
    }
  ];

  static toMongo(filter: FamilyFilter): MongoQuery {
    const query: MongoQuery = {};

    if (!filter) return query;

    for (const map of this.mappers) {
      map(filter, query);
    }

    return query;
  }
}
