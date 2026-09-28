import { Family } from '../../../../../src/Contexts/Agro/Families/domain/entities/Family.js';
import { familyInputMapper } from '../../../../../src/Contexts/Agro/Families/mappers/familyInputMapper.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../shared/fixtures/random.js';
import { FamilyScenarios } from '../domain/mothers/FamilyScenarios.js';

describe('familyInputMapper', () => {
  const USER = 'test-user';

  describe('fromCreateDto', () => {
    it('should create Family without extra', () => {
      const dto = FamilyScenarios.createDtoBase();

      const family = familyInputMapper.fromCreateDto(dto, USER);

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

      const family = familyInputMapper.fromCreateDto(dto, USER);

      expect(family.extra).toEqual(dto.extra);
    });
  });

  describe('toChanges', () => {
    const id = random.uuid();

    it('should include only the given fields (no id)', () => {
      const changes = familyInputMapper.toChanges({
        id,
        name: 'New Name',
        slug: 'new-slug'
      });

      expect(changes).toEqual({ name: 'New Name', slug: 'new-slug' });
      expect(changes).not.toHaveProperty('id');
    });

    it('should pass padded scalars through for the domain to trim', () => {
      const changes = familyInputMapper.toChanges({
        id,
        name: '  Solanaceae  ',
        slug: '  solanum  '
      });

      expect(changes.name).toBe('  Solanaceae  ');
      expect(changes.slug).toBe('  solanum  ');
    });

    it.each(['slug', 'name', 'scientificName', 'shortDescription'] as const)(
      'should keep %s when empty so the domain can reject it',
      (field) => {
        const changes = familyInputMapper.toChanges({ id, [field]: '   ' });

        expect(changes[field]).toBe('   ');
      }
    );

    it('should pass extra: null through as null', () => {
      const changes = familyInputMapper.toChanges({ id, extra: null });

      expect(changes.extra).toBeNull();
    });

    it('should pass extra object with nullable keys through unchanged', () => {
      const changes = familyInputMapper.toChanges({
        id,
        extra: { order: null, speciesCount: 32000 }
      });

      expect(changes.extra).toEqual({ order: null, speciesCount: 32000 });
    });

    it('should pass aliases and highlights through without trimming', () => {
      const changes = familyInputMapper.toChanges({
        id,
        aliases: ['a1', 'a2'],
        highlights: ['h1']
      });

      expect(changes.aliases).toEqual(['a1', 'a2']);
      expect(changes.highlights).toEqual(['h1']);
    });

    it('should return empty object when only id is given', () => {
      const changes = familyInputMapper.toChanges({ id });

      expect(changes).toEqual({});
    });
  });
});
