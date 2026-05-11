import { familyApiMapper } from '../../../../../src/Contexts/Agro/Families/mappers/familyApiMapper.js';
import { Family } from '../../../../../src/Contexts/Agro/Families/domain/entities/Family.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { FamilyScenarios } from '../domain/mothers/FamilyScenarios.js';
import { random } from '../../../shared/fixtures/random.js';

describe('familyApiMapper', () => {
  const USER = 'test-user';

  describe('fromCreateDto', () => {
    it('should create Family without extra', () => {
      const dto = FamilyScenarios.createDtoBase();

      const family = familyApiMapper.fromCreateDto(dto, USER);

      expect(family).toBeInstanceOf(Family);
      expect(family.idValue).toBe(dto.id);
      expect(family.slug).toBe(dto.slug);
      expect(family.name).toBe(dto.name);
      expect(family.aliases).toEqual(dto.aliases);
      expect(family.scientificName).toBe(dto.scientificName);
      expect(family.shortDescription).toBe(dto.shortDescription);
      expect(family.highlights).toEqual(dto.highlights);
      expect(family.extra).toBeUndefined();
      expect(family.metadata).toBeInstanceOf(Metadata);
    });

    it('should create Family with extra', () => {
      const dto = FamilyScenarios.createDtoBaseWithExtra();

      const family = familyApiMapper.fromCreateDto(dto, USER);

      expect(family.extra).toEqual(dto.extra);
    });
  });

  describe('fromUpdateInputToPrimitivesPatch', () => {
    const id = random.uuid();
    it('should map simple fields', () => {
      const input = {
        id,
        name: 'New Name',
        slug: 'new-slug'
      };

      const patch = familyApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch).toEqual({
        id,
        name: 'New Name',
        slug: 'new-slug'
      });
    });

    it('should map nested extra as whole object', () => {
      const input = {
        id,
        extra: {
          order: 'Asterales',
          distribution: 'Cosmopolitan',
          speciesCount: 32000
        }
      };

      const patch = familyApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch).toEqual({
        id,
        extra: {
          order: 'Asterales',
          distribution: 'Cosmopolitan',
          speciesCount: 32000
        }
      });
    });

    it('should ignore undefined fields', () => {
      const input = {
        id,
        slug: 'asteraceae'
      };

      const patch = familyApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch.name).toBeUndefined();
      expect(patch.slug).toBe('asteraceae');
    });

    it('should combine multiple fields including extra', () => {
      const input = {
        id,
        name: 'Updated',
        scientificName: 'New scientific',
        extra: {
          order: 'Asterales'
        }
      };

      const patch = familyApiMapper.fromUpdateInputToPrimitivesPatch(input);

      expect(patch).toEqual({
        id,
        name: 'Updated',
        scientificName: 'New scientific',
        extra: {
          order: 'Asterales'
        }
      });
    });
  });
});
