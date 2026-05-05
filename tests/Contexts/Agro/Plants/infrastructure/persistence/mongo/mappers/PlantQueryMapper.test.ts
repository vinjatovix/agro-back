import type { PlantFilter } from '../../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import { PlantQueryMapper } from '../../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';

describe('PlantQueryMapper', () => {
  it('should return empty query if no filter', () => {
    const result = PlantQueryMapper.toMongo({});
    expect(result).toEqual({});
  });

  it('should map id to $in', () => {
    const filter: PlantFilter = {
      id: { eq: ['plant_1', 'plant_2'] }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['_id']).toEqual({
      $in: ['plant_1', 'plant_2']
    });
  });

  it('should wrap single id into $in', () => {
    const filter: PlantFilter = {
      id: { eq: 'plant_1' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['_id']).toEqual({
      $in: ['plant_1']
    });
  });

  it('should map familyId to $in', () => {
    const filter: PlantFilter = {
      familyId: { eq: ['fam_1', 'fam_2'] }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['identity.familyId']).toEqual({
      $in: ['fam_1', 'fam_2']
    });
  });

  it('should map aliases includesSome to $in', () => {
    const filter: PlantFilter = {
      aliases: { includesSome: ['maravilla', 'calendula'] }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['identity.aliases']).toEqual({
      $in: ['maravilla', 'calendula']
    });
  });

  it('should map lifecycle eq', () => {
    const filter: PlantFilter = {
      lifeCycle: { eq: 'perennial' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['traits.lifecycle']).toBe('perennial');
  });

  it('should match plants that fit within available spacing', () => {
    const filter: PlantFilter = {
      spacingCm: { eq: 40 }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['traits.spacingCm.max']).toEqual({
      $lte: 40
    });
  });

  it('should match any overlapping sowing months', () => {
    const filter: PlantFilter = {
      sowingMonths: { includesSome: [3, 4] }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.months']).toEqual({
      $in: [3, 4]
    });
  });

  it('should match sowing method', () => {
    const filter: PlantFilter = {
      sowingMethod: { eq: 'direct' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.method']).toBe('direct');
  });

  it('should match plants whose ph range contains value', () => {
    const filter: PlantFilter = {
      soilPh: { eq: 6.5 }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.soil.ph.min']).toEqual({ $lte: 6.5 });
    expect(result['knowledge.soil.ph.max']).toEqual({ $gte: 6.5 });
  });

  it('should match plants whose soil depth range contains value', () => {
    const filter: PlantFilter = {
      soilAvailableDepthCm: { eq: 20 }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.soil.availableDepthCm.min']).toEqual({
      $lte: 20
    });

    expect(result['knowledge.soil.availableDepthCm.max']).toEqual({
      $gte: 20
    });
  });

  it('should match plants requiring less or equal light', () => {
    const filter: PlantFilter = {
      lightHoursMin: { eq: 6 }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.light.hoursMin']).toEqual({
      $lte: 6
    });
  });

  it('should match light type', () => {
    const filter: PlantFilter = {
      lightType: { eq: 'full_sun' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.light.type']).toBe('full_sun');
  });

  it('should match strategic benefit contains', () => {
    const filter: PlantFilter = {
      strategicBenefits: { contains: 'pollinator' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.ecology.strategicBenefits']).toEqual({
      $in: ['pollinator']
    });
  });

  it('should match root system type', () => {
    const filter: PlantFilter = {
      rootSystem: { eq: 'taproot' }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result['knowledge.rootSystem.type']).toBe('taproot');
  });

  it('should combine multiple filters correctly', () => {
    const filter: PlantFilter = {
      familyId: { eq: ['fam_asteraceae'] },
      spacingCm: { eq: 30 },
      soilPh: { eq: 6.5 }
    };

    const result = PlantQueryMapper.toMongo(filter);

    expect(result).toEqual({
      'identity.familyId': { $in: ['fam_asteraceae'] },
      'traits.spacingCm.max': { $lte: 30 },
      'knowledge.soil.ph.min': { $lte: 6.5 },
      'knowledge.soil.ph.max': { $gte: 6.5 }
    });
  });
});
