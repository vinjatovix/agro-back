import { escapeRegex } from '../../../../../../../shared/utils/escapeRegex.js';
import type { PlantFilter } from '../../../../domain/entities/types/PlantFilter.js';

type MongoQuery = Record<string, unknown> & {
  $or?: unknown[];
};
type MapperFn = (filter: PlantFilter, query: MongoQuery) => void;

export class PlantQueryMapper {
  private static readonly mappers: MapperFn[] = [
    (filter, query) => {
      const or: Record<string, RegExp>[] = [];

      const contains = filter.identity?.contains;

      if (contains) {
        const regex = new RegExp(escapeRegex(contains), 'i');

        or.push(
          { 'identity.name.primary': regex },
          { 'identity.name.aliases': regex },
          { 'identity.scientificName': regex }
        );
      }

      if (or.length > 0) {
        query.$or = or;
      }
    },

    (filter, query) => {
      if (filter.family?.eq) {
        query['identity.family'] = {
          $in: Array.isArray(filter.family.eq)
            ? filter.family.eq
            : [filter.family.eq]
        };
      }
    },

    (filter, query) => {
      if (filter.lifeCycle?.eq) {
        query['traits.lifecycle'] = {
          $eq: filter.lifeCycle.eq
        };
      }
    },

    (filter, query) => {
      if (filter.spacingCm?.eq !== undefined) {
        query['traits.spacingCm.max'] = {
          $lte: filter.spacingCm.eq
        };
      }
    },

    (filter, query) => {
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

    (filter, query) => {
      if (filter.sowingMethod?.eq) {
        query[`phenology.sowing.methods.${filter.sowingMethod.eq}`] = {
          $exists: true
        };
      }
    },

    (filter, query) => {
      if (filter.soilPh?.eq !== undefined) {
        query['knowledge.soil.ph.min'] = { $lte: filter.soilPh.eq };
        query['knowledge.soil.ph.max'] = { $gte: filter.soilPh.eq };
      }
    },

    (filter, query) => {
      if (filter.soilAvailableDepthCm?.eq !== undefined) {
        query['knowledge.soil.availableDepthCm.min'] = {
          $lte: filter.soilAvailableDepthCm.eq
        };
      }
    },

    (filter, query) => {
      if (filter.lightHoursMin?.eq !== undefined) {
        query['knowledge.light.hoursMin'] = {
          $lte: filter.lightHoursMin.eq
        };
      }
    },

    (filter, query) => {
      if (filter.lightType?.eq) {
        query['knowledge.light.type'] = filter.lightType.eq;
      }
    },

    (filter, query) => {
      if (filter.rootSystem?.eq) {
        query['knowledge.rootSystem.type'] = filter.rootSystem.eq;
      }
    }
  ];

  toMongo(filter: PlantFilter): MongoQuery {
    const query: MongoQuery = {};

    if (!filter) return query;

    for (const map of PlantQueryMapper.mappers) {
      map(filter, query);
    }

    return query;
  }
}
