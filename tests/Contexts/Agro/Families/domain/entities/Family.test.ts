import type { FamilyExtraPrimitives } from '../../../../../../src/Contexts/Agro/Families/domain/types/FamilyExtraPrimitives.js';
import { familyDomainMapper } from '../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { FamilyScenarios } from '../mothers/FamilyScenarios.js';

describe('Family Aggregate', () => {
  it('should successfully create a valid Family', () => {
    const family = FamilyScenarios.domainBase();
    expect(family.idValue).toBeDefined();
    expect(family.slug).toBe('asteraceae');
    expect(family.name).toBe('Asteraceae');
    expect(family.aliases).toEqual(['Compositae']);
    expect(family.scientificName).toBe('Asteraceae');
    expect(family.shortDescription).toBeDefined();
    expect(family.highlights).toHaveLength(2);
    expect(family.extra).toBeUndefined();
    expect(family.metadata).toBeDefined();
  });

  it('should default the version to 0 when props have none', () => {
    const family = FamilyScenarios.domainBase();

    expect(family.version).toBe(0);
  });

  it('should successfully create a Family with extra classification data', () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    expect(family.extra).toBeDefined();
    expect(family.extra?.order).toBe('Asterales');
    expect(family.extra?.speciesCount).toBe(32000);
  });

  it('should throw InvalidArgumentException when slug is missing', () => {
    expect(() => {
      FamilyScenarios.domainRandom({ slug: '' });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({ slug: undefined as unknown as string });
    }).toThrow('Family.slug is required');
  });

  it('should throw InvalidArgumentException when name is missing', () => {
    expect(() => {
      FamilyScenarios.domainRandom({ name: '' });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({ name: undefined as unknown as string });
    }).toThrow('Family.name is required');
  });

  it('should throw InvalidArgumentException when scientificName is missing', () => {
    expect(() => {
      FamilyScenarios.domainRandom({ scientificName: '' });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({
        scientificName: undefined as unknown as string
      });
    }).toThrow('Family.scientificName is required');
  });

  it('should throw InvalidArgumentException when aliases is not an array', () => {
    expect(() => {
      FamilyScenarios.domainRandom({
        aliases: 'not-an-array' as unknown as string[]
      });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({
        aliases: 'not-an-array' as unknown as string[]
      });
    }).toThrow('Family.aliases must be an array');
  });

  it('should throw InvalidArgumentException when highlights is not an array', () => {
    expect(() => {
      FamilyScenarios.domainRandom({
        highlights: 'not-an-array' as unknown as string[]
      });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({
        highlights: 'not-an-array' as unknown as string[]
      });
    }).toThrow('Family.highlights must be an array');
  });

  it('should throw InvalidArgumentException when metadata is missing', () => {
    expect(() => {
      FamilyScenarios.domainRandom({
        metadata: undefined as unknown as Metadata
      });
    }).toThrow(InvalidArgumentException);
    expect(() => {
      FamilyScenarios.domainRandom({
        metadata: undefined as unknown as Metadata
      });
    }).toThrow('Family.metadata is required');
  });

  it('should throw InvalidArgumentException when shortDescription is missing', () => {
    expect(() => {
      FamilyScenarios.domainRandom({
        shortDescription: ''
      });
    }).toThrow(/shortDescription/);
    expect(() => {
      FamilyScenarios.domainRandom({
        shortDescription: undefined as unknown as string
      });
    }).toThrow(/shortDescription/);
  });
});

describe('Family normalisation on create', () => {
  const REQUIRED_TEXTS = [
    'slug',
    'name',
    'scientificName',
    'shortDescription'
  ] as const;

  it.each(REQUIRED_TEXTS)('should trim %s', (field) => {
    // Act
    const family = FamilyScenarios.domainRandom({ [field]: '  Rosaceae  ' });

    // Assert
    expect(family[field]).toBe('Rosaceae');
  });

  it.each(REQUIRED_TEXTS)('should reject a whitespace-only %s', (field) => {
    // Act
    const act = (): unknown => FamilyScenarios.domainRandom({ [field]: '   ' });

    // Assert
    expect(act).toThrow(InvalidArgumentException);
    expect(act).toThrow(new RegExp(`Family\\.${field}`));
  });

  it.each(['aliases', 'highlights'] as const)(
    'should normalise %s with the text-list rule',
    (field) => {
      // Act
      const family = FamilyScenarios.domainRandom({
        [field]: ['Rose family', ' rose family ', '', 'Roses']
      });

      // Assert
      expect(family[field]).toEqual(['Rose family', 'Roses']);
    }
  );

  it.each(['aliases', 'highlights'] as const)(
    'should reject a non-string entry in %s',
    (field) => {
      // Act
      const act = (): unknown =>
        FamilyScenarios.domainRandom({
          [field]: ['Roses', 1] as unknown as string[]
        });

      // Assert
      expect(act).toThrow(InvalidArgumentException);
      expect(act).toThrow(new RegExp(`Family\\.${field}\\.1`));
    }
  );

  it('should drop an empty extra', () => {
    // Act
    const family = FamilyScenarios.domainBaseWithExtra({});

    // Assert
    expect(family.extra).toBeUndefined();
    expect(familyDomainMapper.toPrimitives(family)).not.toHaveProperty('extra');
  });

  it('should normalise extra', () => {
    // Act
    const family = FamilyScenarios.domainBaseWithExtra({
      order: '  Rosales ',
      subfamilies: ['  Rosoideae ', 'rosoideae']
    });

    // Assert
    expect(family.extra).toEqual({
      order: 'Rosales',
      subfamilies: ['Rosoideae']
    });
  });
});

describe('Family.updateInformation', () => {
  it('should replace name and leave other fields unchanged', () => {
    const family = FamilyScenarios.domainRandom();
    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation({ name: 'New Name' }, 'test-user');

    expect(family.name).toBe('New Name');
    expect(family.slug).toBe(before.slug);
    expect(family.scientificName).toBe(before.scientificName);
    expect(family.idValue).toBe(before.id);
    expect(family.version).toBe(before.version);
    expect(family.metadata).toEqual(family.metadata);
  });

  it('should replace aliases and highlights as a full list', () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    family.updateInformation(
      { aliases: ['a1', 'a2'], highlights: ['h1'] },
      'test-user'
    );

    expect(family.aliases).toEqual(['a1', 'a2']);
    expect(family.highlights).toEqual(['h1']);
  });

  it('should remove extra when extra is null', () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    expect(family.extra).toBeDefined();

    family.updateInformation({ extra: null }, 'test-user');

    expect(family.extra).toBeUndefined();
  });

  it('should remove only a specific extra key when set to null', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000,
      subfamilies: [],
      distribution: 'Cosmopolitan'
    });
    family.updateInformation({ extra: { order: null } }, 'test-user');

    expect(family.extra?.order).toBeUndefined();
    expect(family.extra?.speciesCount).toBe(32000);
  });

  it('should remove extra when every key is set to null', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000
    });

    family.updateInformation(
      { extra: { order: null, speciesCount: null } },
      'test-user'
    );

    expect(family.extra).toBeUndefined();
  });

  it('should not create extra from an empty object', () => {
    const family = FamilyScenarios.domainRandom();

    family.updateInformation({ extra: {} }, 'test-user');

    expect(family.extra).toBeUndefined();
  });

  it('should merge extra object key by key', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000,
      subfamilies: [],
      distribution: 'Cosmopolitan'
    });
    family.updateInformation(
      { extra: { distribution: 'Worldwide' } },
      'test-user'
    );

    expect(family.extra?.order).toBe('Asterales');
    expect(family.extra?.distribution).toBe('Worldwide');
    expect(family.extra?.speciesCount).toBe(32000);
  });

  it('should trim aliases and drop empty ones', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation({ aliases: [' a1 ', '  ', 'a2'] }, 'test-user');

    expect(family.aliases).toEqual(['a1', 'a2']);
  });

  it('should drop case-insensitive duplicate aliases', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation(
      { aliases: ['Rose family', ' rose family ', 'Roses'] },
      'test-user'
    );

    expect(family.aliases).toEqual(['Rose family', 'Roses']);
  });

  it('should normalise highlights with the text-list rule', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation(
      { highlights: ['  Five petals ', '', '  ', 'five petals'] },
      'test-user'
    );

    expect(family.highlights).toEqual(['Five petals']);
  });

  it('should normalise extra.subfamilies with the text-list rule', () => {
    const family = FamilyScenarios.domainBaseWithExtra({ order: 'Rosales' });
    family.updateInformation(
      { extra: { subfamilies: ['  Rosoideae ', '', 'ROSOIDEAE'] } },
      'test-user'
    );

    expect(family.extra).toEqual({
      order: 'Rosales',
      subfamilies: ['Rosoideae']
    });
  });

  it.each([
    ['aliases', { aliases: ['a1', 1] as unknown as string[] }],
    ['highlights', { highlights: ['h1', 1] as unknown as string[] }],
    [
      'extra.subfamilies',
      {
        extra: {
          subfamilies: ['s1', 1]
        } as unknown as FamilyExtraPrimitives
      }
    ]
  ])(
    'should throw InvalidArgumentException for a non-string entry in %s',
    (_label, changes) => {
      const family = FamilyScenarios.domainRandom();
      const before = familyDomainMapper.toPrimitives(family);

      expect(() => family.updateInformation(changes, 'test-user')).toThrow(
        InvalidArgumentException
      );
      expect(familyDomainMapper.toPrimitives(family)).toEqual(before);
    }
  );

  it.each(['aliases', 'highlights'] as const)(
    'should throw InvalidArgumentException when %s is not an array',
    (field) => {
      const family = FamilyScenarios.domainRandom();

      expect(() =>
        family.updateInformation(
          { [field]: 'not-an-array' as unknown as string[] },
          'test-user'
        )
      ).toThrow(InvalidArgumentException);
    }
  );

  it('should trim and store a padded name', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation({ name: '  Solanaceae  ' }, 'test-user');

    expect(family.name).toBe('Solanaceae');
  });

  it.each(['slug', 'name', 'scientificName', 'shortDescription'] as const)(
    'should throw InvalidArgumentException when %s is whitespace-only and leave family unchanged',
    (field) => {
      const family = FamilyScenarios.domainRandom();
      const before = familyDomainMapper.toPrimitives(family);

      expect(() => {
        family.updateInformation({ [field]: '   ' }, 'test-user');
      }).toThrow(new RegExp(field));

      expect(familyDomainMapper.toPrimitives(family)).toEqual(before);
    }
  );

  it.each(['slug', 'name', 'scientificName', 'shortDescription'] as const)(
    'should throw InvalidArgumentException when %s is empty and leave family unchanged',
    (field) => {
      const family = FamilyScenarios.domainRandom();
      const before = familyDomainMapper.toPrimitives(family);

      expect(() => {
        family.updateInformation({ [field]: '' }, 'test-user');
      }).toThrow(new RegExp(field));

      expect(familyDomainMapper.toPrimitives(family)).toEqual(before);
    }
  );

  it('should not change id or version after update', () => {
    const family = FamilyScenarios.domainRandom();
    const beforeId = family.idValue;
    const beforeVersion = family.version;

    family.updateInformation({ name: 'Changed' }, 'test-user');

    expect(family.idValue).toBe(beforeId);
    expect(family.version).toBe(beforeVersion);
  });
});

describe('Family audit metadata', () => {
  const OLD = new Date('2024-01-01T00:00:00.000Z');

  const auditedFamily = () =>
    familyDomainMapper.fromPrimitives({
      ...familyDomainMapper.toPrimitives(FamilyScenarios.domainBaseWithExtra()),
      metadata: {
        createdAt: OLD,
        createdBy: 'creator',
        updatedAt: OLD,
        updatedBy: 'creator'
      }
    });

  it('a real change refreshes audit data and keeps the created pair', () => {
    const family = auditedFamily();

    family.updateInformation({ name: 'Changed' }, 'editor');

    expect(family.metadata.updatedBy).toBe('editor');
    expect(family.metadata.updatedAt.getTime()).toBeGreaterThan(OLD.getTime());
    expect(family.metadata.createdBy).toBe('creator');
    expect(family.metadata.createdAt).toEqual(OLD);
  });

  it.each([
    ['no fields', {}],
    ['the same name', { name: 'Asteraceae' }],
    ['the same extra key', { extra: { order: 'Asterales' } }],
    ['an empty extra', { extra: {} }]
  ])('%s leaves the aggregate untouched', (_label, changes) => {
    const family = auditedFamily();
    const metadata = family.metadata;
    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation(changes, 'editor');

    expect(family.metadata).toBe(metadata);
    expect(familyDomainMapper.toPrimitives(family)).toEqual(before);
  });

  it('an invalid change leaves metadata untouched', () => {
    const family = auditedFamily();
    const metadata = family.metadata;

    expect(() => family.updateInformation({ name: '  ' }, 'editor')).toThrow(
      InvalidArgumentException
    );
    expect(family.metadata).toBe(metadata);
  });

  describe('syncVersion', () => {
    it.each([
      ['written', 1],
      ['unchanged', 0]
    ] as const)(
      'applies a %s outcome as the current version + %i without touching metadata',
      (outcome, step) => {
        const family = auditedFamily();
        const metadata = family.metadata;

        family.syncVersion(outcome);

        expect(family.version).toBe(step);
        expect(family.metadata).toBe(metadata);
      }
    );
  });
});
