import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import { Family } from '../domain/entities/Family.js';
import type { FamilyApiMapper } from './interfaces/FamilyApiMapper.js';

export const familyApiMapper: FamilyApiMapper = {
  fromCreateDto(dto, user) {
    return Family.create({
      id: Uuid.create(dto.id),
      slug: dto.slug,
      name: dto.name,
      aliases: dto.aliases,
      scientificName: dto.scientificName,
      shortDescription: dto.shortDescription,
      highlights: dto.highlights,
      ...(dto.extra ? { extra: dto.extra } : {}),
      metadata: Metadata.create(user)
    });
  },

  fromUpdateDtoToPrimitivesPatch(dto) {
    return {
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.aliases !== undefined && { aliases: dto.aliases }),
      ...(dto.scientificName !== undefined && {
        scientificName: dto.scientificName
      }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: dto.shortDescription
      }),
      ...(dto.highlights !== undefined && { highlights: dto.highlights }),
      ...(dto.extra !== undefined && { extra: dto.extra })
    };
  }
};
