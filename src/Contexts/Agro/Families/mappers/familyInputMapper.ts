import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { Family } from '../domain/entities/Family.js';
import { createFamilyId } from '../domain/FamilyId.js';
import type { FamilyInformationChanges } from '../domain/types/FamilyInformationChanges.js';
import type { FamilyInputMapper } from './interfaces/FamilyInputMapper.js';

export const familyInputMapper: FamilyInputMapper = {
  fromCreateDto(dto, user) {
    return Family.create({
      id: createFamilyId(dto.id),
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

  toChanges(input): FamilyInformationChanges {
    const changes: FamilyInformationChanges = {};

    // Passed through untouched: the domain trims and rejects empty values.
    if (input.slug !== undefined) changes.slug = input.slug;
    if (input.name !== undefined) changes.name = input.name;
    if (input.scientificName !== undefined)
      changes.scientificName = input.scientificName;
    if (input.shortDescription !== undefined)
      changes.shortDescription = input.shortDescription;
    if (input.aliases !== undefined) changes.aliases = input.aliases;
    if (input.highlights !== undefined) changes.highlights = input.highlights;
    if (input.extra !== undefined) changes.extra = input.extra;

    return changes;
  }
};
