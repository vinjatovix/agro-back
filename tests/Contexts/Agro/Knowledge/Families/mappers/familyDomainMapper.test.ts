import { Family } from '../../../../../../src/Contexts/Agro/Knowledge/Families/domain/entities/Family.js';
import { familyDomainMapper } from '../../../../../../src/Contexts/Agro/Knowledge/Families/mappers/familyDomainMapper.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../../shared/fixtures/random.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { FamilyScenarios } from '../domain/mothers/FamilyScenarios.js';

describe('familyDomainMapper', () => {
  describe('fromPrimitives', () => {
    const primitives = {
      id: UuidMother.random().value,
      slug: random.word(),
      name: random.word(),
      aliases: [random.word(), random.word()],
      scientificName: random.word(),
      shortDescription: random.description(),
      highlights: [random.word(), random.word()],
      metadata: Metadata.create('test-user').toPrimitives()
    };

    it('should create a Family domain entity from primitives without optional fields', () => {
      const family = familyDomainMapper.fromPrimitives(primitives);

      expect(family).toBeInstanceOf(Family);
      expect(family.idValue).toBe(primitives.id);
      expect(family.slug).toBe(primitives.slug);
      expect(family.name).toBe(primitives.name);
      expect(family.aliases).toEqual(primitives.aliases);
      expect(family.scientificName).toBe(primitives.scientificName);
      expect(family.shortDescription).toBe(primitives.shortDescription);
      expect(family.highlights).toEqual(primitives.highlights);
      expect(family.metadata).toBeInstanceOf(Metadata);
      expect(family.extra).toBeUndefined();
    });

    it('should create a Family domain entity from primitives with optional fields', () => {
      const familyExtra = {
        order: random.word(),
        distribution: random.word(),
        speciesCount: random.integer()
      };

      const family = familyDomainMapper.fromPrimitives({
        ...primitives,
        extra: familyExtra
      });

      expect(family.extra).toEqual(familyExtra);
    });
  });

  describe('toPrimitives', () => {
    it('should convert Family domain entity to primitives without optional fields', () => {
      const family = FamilyScenarios.domainBase();

      const result = familyDomainMapper.toPrimitives(family);

      expect(result).toEqual({
        id: family.idValue,
        slug: family.slug,
        name: family.name,
        aliases: family.aliases,
        scientificName: family.scientificName,
        shortDescription: family.shortDescription,
        highlights: family.highlights,
        metadata: family.metadata.toPrimitives()
      });
    });

    it('should convert Family domain entity to primitives with optional fields', () => {
      const family = FamilyScenarios.domainBaseWithExtra();

      const result = familyDomainMapper.toPrimitives(family);

      expect(result).toEqual({
        id: family.idValue,
        slug: family.slug,
        name: family.name,
        aliases: family.aliases,
        scientificName: family.scientificName,
        shortDescription: family.shortDescription,
        highlights: family.highlights,
        extra: family.extra,
        metadata: family.metadata.toPrimitives()
      });
    });
  });
});
