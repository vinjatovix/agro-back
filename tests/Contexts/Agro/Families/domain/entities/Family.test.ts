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
});
