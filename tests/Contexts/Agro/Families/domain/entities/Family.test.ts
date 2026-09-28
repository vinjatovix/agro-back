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

describe('Family.updateInformation', () => {
  it('should replace name and leave other fields unchanged', () => {
    const family = FamilyScenarios.domainRandom();
    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation({ name: 'New Name' });

    expect(family.name).toBe('New Name');
    expect(family.slug).toBe(before.slug);
    expect(family.scientificName).toBe(before.scientificName);
    expect(family.idValue).toBe(before.id);
    expect(family.version).toBe(before.version);
    expect(family.metadata).toEqual(family.metadata);
  });

  it('should replace aliases and highlights as a full list', () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    family.updateInformation({ aliases: ['a1', 'a2'], highlights: ['h1'] });

    expect(family.aliases).toEqual(['a1', 'a2']);
    expect(family.highlights).toEqual(['h1']);
  });

  it('should remove extra when extra is null', () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    expect(family.extra).toBeDefined();

    family.updateInformation({ extra: null });

    expect(family.extra).toBeUndefined();
  });

  it('should remove only a specific extra key when set to null', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000,
      subfamilies: [],
      distribution: 'Cosmopolitan'
    });
    family.updateInformation({ extra: { order: null } });

    expect(family.extra?.order).toBeUndefined();
    expect(family.extra?.speciesCount).toBe(32000);
  });

  it('should remove extra when every key is set to null', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000
    });

    family.updateInformation({ extra: { order: null, speciesCount: null } });

    expect(family.extra).toBeUndefined();
  });

  it('should not create extra from an empty object', () => {
    const family = FamilyScenarios.domainRandom();

    family.updateInformation({ extra: {} });

    expect(family.extra).toBeUndefined();
  });

  it('should merge extra object key by key', () => {
    const family = FamilyScenarios.domainBaseWithExtra({
      order: 'Asterales',
      speciesCount: 32000,
      subfamilies: [],
      distribution: 'Cosmopolitan'
    });
    family.updateInformation({ extra: { distribution: 'Worldwide' } });

    expect(family.extra?.order).toBe('Asterales');
    expect(family.extra?.distribution).toBe('Worldwide');
    expect(family.extra?.speciesCount).toBe(32000);
  });

  it('should trim aliases and drop empty ones', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation({ aliases: [' a1 ', '  ', 'a2'] });

    expect(family.aliases).toEqual(['a1', 'a2']);
  });

  it('should trim and store a padded name', () => {
    const family = FamilyScenarios.domainRandom();
    family.updateInformation({ name: '  Solanaceae  ' });

    expect(family.name).toBe('Solanaceae');
  });

  it.each(['slug', 'name', 'scientificName', 'shortDescription'] as const)(
    'should throw InvalidArgumentException when %s is whitespace-only and leave family unchanged',
    (field) => {
      const family = FamilyScenarios.domainRandom();
      const before = familyDomainMapper.toPrimitives(family);

      expect(() => {
        family.updateInformation({ [field]: '   ' });
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
        family.updateInformation({ [field]: '' });
      }).toThrow(new RegExp(field));

      expect(familyDomainMapper.toPrimitives(family)).toEqual(before);
    }
  );

  it('should not change id, version, or metadata after update', () => {
    const family = FamilyScenarios.domainRandom();
    const beforeId = family.idValue;
    const beforeVersion = family.version;
    const beforeMetadata = familyDomainMapper.toPrimitives(family).metadata;

    family.updateInformation({ name: 'Changed' });

    expect(family.idValue).toBe(beforeId);
    expect(family.version).toBe(beforeVersion);
    expect(familyDomainMapper.toPrimitives(family).metadata).toEqual(
      beforeMetadata
    );
  });
});
