import type { PlantFilter } from '../../../../domain/entities/types/PlantFilter.js';

type MongoQuery = Record<string, unknown>;
type MapperFn = (filter: PlantFilter, query: MongoQuery) => void;

export class PlantQueryMapper {
  private static readonly mappers: MapperFn[] = [
    (filter, query) => {
      if (filter.id?.eq) {
        query['_id'] = {
          $eq: Array.isArray(filter.id.eq) ? filter.id.eq : [filter.id.eq]
        };
      } else if (filter.id?.has) {
        query['_id'] = {
          $in: filter.id.has
        };
      }
    },

    (filter, query) => {
      if (filter.aliases?.hasAny) {
        query['identity.name.aliases'] = {
          $in: filter.aliases.hasAny
        };
      } else if (filter.aliases?.has) {
        query['identity.name.aliases'] = Array.isArray(filter.aliases.has)
          ? { $all: filter.aliases.has }
          : filter.aliases.has;
      }
    },

    (filter, query) => {
      if (filter.family?.eq) {
        query['identity.family'] = {
          $in: Array.isArray(filter.family.eq)
            ? filter.family.eq
            : [filter.family.eq]
        };
      } else if (filter.family?.has) {
        query['identity.family'] = {
          $in: filter.family.has
        };
      }
    },

    (filter, query) => {
      if (filter.lifeCycle?.eq) {
        query['traits.lifecycle'] = {
          $eq: filter.lifeCycle.eq
        };
      } else if (filter.lifeCycle?.has) {
        query['traits.lifecycle'] = {
          $in: filter.lifeCycle.has
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
        query['phenology.sowing.method'] = filter.sowingMethod.eq;
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
        query['knowledge.soil.availableDepthCm.max'] = {
          $gte: filter.soilAvailableDepthCm.eq
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
      if (filter.strategicBenefits?.contains) {
        query['knowledge.ecology.strategicBenefits'] = {
          $in: [filter.strategicBenefits.contains]
        };
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
