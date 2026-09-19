import type { PlantFilter } from '../../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import { PlantQueryMapper } from '../../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';

describe('PlantQueryMapper', () => {
  const plantQueryMapper = new PlantQueryMapper();
  it('should return empty query if no filter', () => {
    const result = plantQueryMapper.toMongo({});
    expect(result).toEqual({});
  });

  it('should map family to $in', () => {
    const filter: PlantFilter = {
      family: { eq: 'fam_1' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['identity.family']).toEqual({
      $in: ['fam_1']
    });
  });

  it('should map identity contains to $or with regex', () => {
    const filter: PlantFilter = {
      identity: { contains: 'rose' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result.$or).toBeDefined();
    expect(result.$or).toHaveLength(3);

    expect(result.$or).toEqual(
      expect.arrayContaining([
        { 'identity.name.primary': /rose/i },
        { 'identity.name.aliases': /rose/i },
        { 'identity.scientificName': /rose/i }
      ])
    );
  });

  it('should map lifecycle eq', () => {
    const filter: PlantFilter = {
      lifeCycle: { eq: 'perennial' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['traits.lifecycle']).toEqual({
      $eq: 'perennial'
    });
  });

  it('should match plants that fit within available spacing', () => {
    const filter: PlantFilter = {
      spacingCm: { eq: 40 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['traits.spacingCm.max']).toEqual({
      $lte: 40
    });
  });

  it('should match any overlapping sowing months', () => {
    const filter: PlantFilter = {
      sowingMonths: { hasAny: [3, 4] }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.months']).toEqual({
      $in: [3, 4]
    });
  });

  it('should match plants that match specific sowing month', () => {
    const filter: PlantFilter = {
      sowingMonths: { has: 5 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.months']).toEqual({
      $eq: 5
    });
  });

  it('should match plants that match specific sowing months', () => {
    const filter: PlantFilter = {
      sowingMonths: { has: [5, 6] }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.months']).toEqual({
      $eq: [5, 6]
    });
  });

  it('should match sowing method', () => {
    const filter: PlantFilter = {
      sowingMethod: { eq: 'direct' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['phenology.sowing.methods.direct']).toEqual({
      $exists: true
    });
  });

  it('should match plants whose ph range contains value', () => {
    const filter: PlantFilter = {
      soilPh: { eq: 6.5 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['knowledge.soil.ph.min']).toEqual({ $lte: 6.5 });
    expect(result['knowledge.soil.ph.max']).toEqual({ $gte: 6.5 });
  });

  it('should match plants whose soil depth range contains value', () => {
    const filter: PlantFilter = {
      soilAvailableDepthCm: { eq: 20 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['knowledge.soil.availableDepthCm.min']).toEqual({
      $lte: 20
    });
  });

  it('should match plants requiring less or equal light', () => {
    const filter: PlantFilter = {
      lightHoursMin: { eq: 6 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['knowledge.light.hoursMin']).toEqual({
      $lte: 6
    });
  });

  it('should match light type', () => {
    const filter: PlantFilter = {
      lightType: { eq: 'full_sun' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['knowledge.light.type']).toBe('full_sun');
  });

  it('should match root system type', () => {
    const filter: PlantFilter = {
      rootSystem: { eq: 'taproot' }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result['knowledge.rootSystem.type']).toBe('taproot');
  });

  it('should combine multiple filters correctly', () => {
    const filter: PlantFilter = {
      family: { eq: 'fam_asteraceae' },
      spacingCm: { eq: 30 },
      soilPh: { eq: 6.5 }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result).toEqual({
      'identity.family': { $in: ['fam_asteraceae'] },
      'traits.spacingCm.max': { $lte: 30 },
      'knowledge.soil.ph.min': { $lte: 6.5 },
      'knowledge.soil.ph.max': { $gte: 6.5 }
    });
  });

  it('should escape regex special characters in identity contains', () => {
    const filter: PlantFilter = {
      identity: { contains: 'ro.se*[]' }
    };

    const result = plantQueryMapper.toMongo(filter) as {
      $or: Array<Record<string, RegExp>>;
    };

    expect(result.$or).toEqual(
      expect.arrayContaining([
        {
          'identity.name.primary': /ro\.se\*\[\]/i
        },
        {
          'identity.name.aliases': /ro\.se\*\[\]/i
        },
        {
          'identity.scientificName': /ro\.se\*\[\]/i
        }
      ])
    );
  });
});
