import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { Family } from '../domain/entities/Family.js';
import { createFamilyId } from '../domain/FamilyId.js';
import type { FamilyDomainMapper } from './interfaces/FamilyDomainMapper.js';

export const familyDomainMapper: FamilyDomainMapper = {
  toPrimitives(family) {
    return {
      id: family.id,
      slug: family.slug,
      name: family.name,
      aliases: family.aliases,
      scientificName: family.scientificName,
      shortDescription: family.shortDescription,
      highlights: family.highlights,
      ...(family.extra ? { extra: family.extra } : {}),
      metadata: family.metadata.toPrimitives()
    };
  },

  fromPrimitives(primitives) {
    return Family.create({
      id: createFamilyId(primitives.id),
      slug: primitives.slug,
      name: primitives.name,
      aliases: primitives.aliases,
      scientificName: primitives.scientificName,
      shortDescription: primitives.shortDescription,
      highlights: primitives.highlights,
      ...(primitives.extra ? { extra: primitives.extra } : {}),
      metadata: Metadata.fromPrimitives(primitives.metadata)
    });
  }
};
