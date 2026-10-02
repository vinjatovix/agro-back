import type { StringFilter } from '../../../../../../../shared/domain/query/interfaces/StringFilter.js';
import { findTextPatternCondition } from '../../../../../../shared/infrastructure/persistence/mongo/textPatternCondition.js';
import type { PlantFilter } from '../../../../domain/entities/types/PlantFilter.js';

type MongoQuery = Record<string, unknown>;
type OrClause = MongoQuery[];
// Fields matched across several paths add an `$or` clause; several clauses are
// combined under `$and` so none overwrites another.
type QueryParts = { query: MongoQuery; orClauses: OrClause[] };
type MapperFn = (filter: PlantFilter, parts: QueryParts) => void;

const IDENTITY_PATHS = [
  'identity.name.primary',
  'identity.name.aliases',
  'identity.scientificName'
] as const;

const sowingMethodPath = (method: string): string =>
  `phenology.sowing.methods.${method}`;

/** Exact value, any of the values, or a literal text pattern. */
const textCondition = (filter: StringFilter): unknown => {
  if (filter.eq !== undefined) return filter.eq;
  if (filter.in !== undefined) return { $in: filter.in };

  return findTextPatternCondition(filter);
};

const setTextCondition = (
  query: MongoQuery,
  path: string,
  filter: StringFilter | undefined
): void => {
  if (filter === undefined) return;

  const condition = textCondition(filter);
  if (condition !== undefined) query[path] = condition;
};

export class PlantQueryMapper {
  private static readonly mappers: MapperFn[] = [
    (filter, { orClauses }) => {
      if (filter.identity === undefined) return;

      const condition = textCondition(filter.identity);
      if (condition === undefined) return;

      orClauses.push(IDENTITY_PATHS.map((path) => ({ [path]: condition })));
    },

    (filter, { query }) => {
      if (filter.family?.eq) {
        query['identity.family'] = {
          $in: Array.isArray(filter.family.eq)
            ? filter.family.eq
            : [filter.family.eq]
        };
      } else if (filter.family?.in) {
        query['identity.family'] = { $in: filter.family.in };
      }
    },

    (filter, { query }) => {
      if (filter.lifeCycle?.eq) {
        query['traits.lifecycle'] = {
          $eq: filter.lifeCycle.eq
        };
      } else if (filter.lifeCycle?.in) {
        query['traits.lifecycle'] = { $in: filter.lifeCycle.in };
      }
    },

    (filter, { query }) => {
      if (filter.spacingCm?.eq !== undefined) {
        query['traits.spacingCm.max'] = {
          $lte: filter.spacingCm.eq
        };
      }
    },

    (filter, { query }) => {
      if (filter.sowingMonths?.has) {
        query['phenology.sowing.months'] = {
          $eq: filter.sowingMonths.has
        };
      } else if (filter.sowingMonths?.hasAny) {
        query['phenology.sowing.months'] = {
          $in: filter.sowingMonths.hasAny
        };
      }
    },

    (filter, { query, orClauses }) => {
      if (filter.sowingMethod?.eq) {
        query[sowingMethodPath(filter.sowingMethod.eq)] = {
          $exists: true
        };
      } else if (filter.sowingMethod?.in) {
        orClauses.push(
          filter.sowingMethod.in.map((method) => ({
            [sowingMethodPath(method)]: { $exists: true }
          }))
        );
      }
    },

    (filter, { query }) => {
      if (filter.soilPh?.eq !== undefined) {
        query['knowledge.soil.ph.min'] = { $lte: filter.soilPh.eq };
        query['knowledge.soil.ph.max'] = { $gte: filter.soilPh.eq };
      }
    },

    (filter, { query }) => {
      if (filter.soilAvailableDepthCm?.eq !== undefined) {
        query['knowledge.soil.availableDepthCm.min'] = {
          $lte: filter.soilAvailableDepthCm.eq
        };
      }
    },

    (filter, { query }) => {
      if (filter.lightHoursMin?.eq !== undefined) {
        query['knowledge.light.hoursMin'] = {
          $lte: filter.lightHoursMin.eq
        };
      }
    },

    (filter, { query }) => {
      setTextCondition(query, 'knowledge.light.type', filter.lightType);
    },

    (filter, { query }) => {
      setTextCondition(query, 'knowledge.rootSystem.type', filter.rootSystem);
    },

    (filter, { query }) => {
      if (filter.status?.eq) {
        query.status = filter.status.eq;
      } else if (filter.status?.in) {
        query.status = { $in: filter.status.in };
      }
    }
  ];

  toMongo(filter: PlantFilter): MongoQuery {
    const parts: QueryParts = { query: {}, orClauses: [] };

    if (!filter) return parts.query;

    for (const map of PlantQueryMapper.mappers) {
      map(filter, parts);
    }

    return PlantQueryMapper.withOrClauses(parts);
  }

  private static withOrClauses({ query, orClauses }: QueryParts): MongoQuery {
    const [first, ...rest] = orClauses;
    if (first === undefined) return query;
    if (rest.length === 0) return { ...query, $or: first };

    return { ...query, $and: orClauses.map((clause) => ({ $or: clause })) };
  }
}
