import { Metadata, Uuid } from '../../../shared/domain/valueObject/index.js';
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

  fromUpdateInputToPrimitivesPatch(input) {
    return {
      id: new Uuid(input.id).value,
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.aliases !== undefined && { aliases: input.aliases }),
      ...(input.scientificName !== undefined && {
        scientificName: input.scientificName
      }),
      ...(input.shortDescription !== undefined && {
        shortDescription: input.shortDescription
      }),
      ...(input.highlights !== undefined && { highlights: input.highlights }),
      ...(input.extra !== undefined && { extra: input.extra })
    };
  }
};
