import { familyApiMapper } from '../../../../../../src/Contexts/Agro/Knowledge/Families/mappers/familyApiMapper.js';
import { Family } from '../../../../../../src/Contexts/Agro/Knowledge/Families/domain/entities/Family.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { FamilyScenarios } from '../domain/mothers/FamilyScenarios.js';

describe('familyApiMapper', () => {
  const USER = 'test-user';

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

  it('should return empty patch when dto is empty', () => {
    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch({});

    expect(patch).toEqual({});
  });

  it('should map simple fields', () => {
    const dto = {
      name: 'New Name',
      slug: 'new-slug'
    };

    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch(dto);

    expect(patch).toEqual({
      name: 'New Name',
      slug: 'new-slug'
    });
  });

  it('should map nested extra as whole object', () => {
    const dto = {
      extra: {
        order: 'Asterales',
        distribution: 'Cosmopolitan',
        speciesCount: 32000
      }
    };

    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch(dto);

    expect(patch).toEqual(dto);
  });

  it('should ignore undefined fields', () => {
    const dto = {
      slug: 'asteraceae'
    };

    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch(dto);

    expect(patch.name).toBeUndefined();
    expect(patch.slug).toBe('asteraceae');
  });

  it('should combine multiple fields including extra', () => {
    const dto = {
      name: 'Updated',
      scientificName: 'New scientific',
      extra: {
        order: 'Asterales'
      }
    };

    const patch = familyApiMapper.fromUpdateDtoToPrimitivesPatch(dto);

    expect(patch).toEqual({
      name: 'Updated',
      scientificName: 'New scientific',
      extra: {
        order: 'Asterales'
      }
    });
  });
});
