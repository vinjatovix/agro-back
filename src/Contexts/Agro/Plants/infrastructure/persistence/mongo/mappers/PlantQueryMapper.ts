import type { PlantFilter } from '../../../../domain/entities/types/PlantFilter.js';

type MongoQuery = Record<string, unknown>;
type MapperFn = (filter: PlantFilter, query: MongoQuery) => void;

export class PlantQueryMapper {
  private static readonly mappers: MapperFn[] = [
    (filter, query) => {
      if (filter.id?.eq) {
        query['_id'] = {
          $in: Array.isArray(filter.id.eq) ? filter.id.eq : [filter.id.eq]
        };
      }
    },

    (filter, query) => {
      if (filter.aliases?.includesSome) {
        query['identity.aliases'] = {
          $in: filter.aliases.includesSome
        };
      }
    },

    (filter, query) => {
      if (filter.familyId?.eq) {
        query['identity.familyId'] = {
          $in: Array.isArray(filter.familyId.eq)
            ? filter.familyId.eq
            : [filter.familyId.eq]
        };
      }
    },

    (filter, query) => {
      if (filter.lifeCycle?.eq) {
        query['traits.lifecycle'] = filter.lifeCycle.eq;
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
      if (filter.sowingMonths?.includesSome) {
        query['phenology.sowing.months'] = {
          $in: filter.sowingMonths.includesSome
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

  static toMongo(filter: PlantFilter): MongoQuery {
    const query: MongoQuery = {};

    if (!filter) return query;

    for (const map of this.mappers) {
      map(filter, query);
    }

    return query;
  }
}
