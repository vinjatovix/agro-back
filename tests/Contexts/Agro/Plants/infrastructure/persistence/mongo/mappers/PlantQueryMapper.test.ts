import type { PlantFilter } from '../../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
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
        { 'identity.name.primary': { $regex: 'rose', $options: 'i' } },
        { 'identity.name.aliases': { $regex: 'rose', $options: 'i' } },
        { 'identity.scientificName': { $regex: 'rose', $options: 'i' } }
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

  it('should map status eq', () => {
    const filter: PlantFilter = {
      status: { eq: PlantStatus.ACTIVE }
    };

    const result = plantQueryMapper.toMongo(filter);

    expect(result.status).toEqual(PlantStatus.ACTIVE);
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
      $or: Array<Record<string, unknown>>;
    };

    expect(result.$or).toEqual(
      expect.arrayContaining([
        {
          'identity.name.primary': { $regex: 'ro\\.se\\*\\[\\]', $options: 'i' }
        },
        {
          'identity.name.aliases': { $regex: 'ro\\.se\\*\\[\\]', $options: 'i' }
        },
        {
          'identity.scientificName': {
            $regex: 'ro\\.se\\*\\[\\]',
            $options: 'i'
          }
        }
      ])
    );
  });

  describe('identity text operators', () => {
    const IDENTITY_PATHS = [
      'identity.name.primary',
      'identity.name.aliases',
      'identity.scientificName'
    ];

    it.each([
      ['eq', 'Tomate', 'Tomate'],
      ['in', ['Tomate', 'Apio'], { $in: ['Tomate', 'Apio'] }],
      ['startsWith', 'To(m', { $regex: '^To\\(m', $options: 'i' }],
      ['endsWith', 'a.e', { $regex: 'a\\.e$', $options: 'i' }]
    ])(
      'should map identity %s to $or over the name paths',
      (operator, value, condition) => {
        // Arrange
        const filter = { identity: { [operator]: value } } as PlantFilter;

        // Act
        const result = plantQueryMapper.toMongo(filter);

        // Assert
        expect(result).toEqual({
          $or: IDENTITY_PATHS.map((path) => ({ [path]: condition }))
        });
      }
    );
  });

  it.each([
    [
      'family in',
      { family: { in: ['fam_1', 'fam_2'] } },
      { 'identity.family': { $in: ['fam_1', 'fam_2'] } }
    ],
    [
      'lifeCycle in',
      { lifeCycle: { in: ['annual', 'biennial'] } },
      { 'traits.lifecycle': { $in: ['annual', 'biennial'] } }
    ],
    [
      'lightType in',
      { lightType: { in: ['full_sun', 'shade'] } },
      { 'knowledge.light.type': { $in: ['full_sun', 'shade'] } }
    ],
    [
      'rootSystem in',
      { rootSystem: { in: ['fibrous'] } },
      { 'knowledge.rootSystem.type': { $in: ['fibrous'] } }
    ],
    [
      'lightType contains',
      { lightType: { contains: 'sun' } },
      { 'knowledge.light.type': { $regex: 'sun', $options: 'i' } }
    ],
    [
      'lightType startsWith',
      { lightType: { startsWith: 'full' } },
      { 'knowledge.light.type': { $regex: '^full', $options: 'i' } }
    ],
    [
      'rootSystem endsWith',
      { rootSystem: { endsWith: 'root' } },
      { 'knowledge.rootSystem.type': { $regex: 'root$', $options: 'i' } }
    ],
    [
      'rootSystem contains with pattern characters',
      { rootSystem: { contains: '.*' } },
      { 'knowledge.rootSystem.type': { $regex: '\\.\\*', $options: 'i' } }
    ],
    [
      'sowingMethod in',
      { sowingMethod: { in: ['direct', 'starter'] } },
      {
        $or: [
          { 'phenology.sowing.methods.direct': { $exists: true } },
          { 'phenology.sowing.methods.starter': { $exists: true } }
        ]
      }
    ]
  ])('should map %s', (_label, filter, expected) => {
    // Act
    const result = plantQueryMapper.toMongo(filter as PlantFilter);

    // Assert
    expect(result).toEqual(expected);
  });

  it('should keep both $or clauses when identity and sowingMethod in are combined', () => {
    // Arrange
    const filter: PlantFilter = {
      identity: { startsWith: 'Tom' },
      sowingMethod: { in: ['direct', 'starter'] }
    };

    // Act
    const result = plantQueryMapper.toMongo(filter);

    // Assert
    expect(result).not.toHaveProperty('$or');
    expect(result.$and).toEqual([
      {
        $or: [
          { 'identity.name.primary': { $regex: '^Tom', $options: 'i' } },
          { 'identity.name.aliases': { $regex: '^Tom', $options: 'i' } },
          { 'identity.scientificName': { $regex: '^Tom', $options: 'i' } }
        ]
      },
      {
        $or: [
          { 'phenology.sowing.methods.direct': { $exists: true } },
          { 'phenology.sowing.methods.starter': { $exists: true } }
        ]
      }
    ]);
  });
});
