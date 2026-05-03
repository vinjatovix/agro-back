import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import { Family } from '../domain/entities/Family.js';
import type { FamilyDomainMapper } from './interfaces/FamilyDomainMapper.js';

export const familyDomainMapper: FamilyDomainMapper = {
  toPrimitives(family) {
    return {
      id: family.idValue,
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
      id: Uuid.create(primitives.id),
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
