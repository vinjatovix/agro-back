import { createFamilyId } from '../../Families/domain/FamilyId.js';
import type { IdentityDomain } from '../domain/entities/types/IdentityDomain.js';
import type { IdentityPrimitives } from '../domain/entities/types/IdentityPrimitives.js';

export const plantIdentityMapper = {
  toPrimitives(identity: IdentityDomain): IdentityPrimitives {
    return {
      name: identity.name,
      family: identity.family,
      ...(identity.scientificName !== undefined && {
        scientificName: identity.scientificName
      })
    };
  },

  fromPrimitives(primitives: IdentityPrimitives): IdentityDomain {
    return {
      name: primitives.name,
      family: createFamilyId(primitives.family),
      ...(primitives.scientificName !== undefined &&
        primitives.scientificName !== null && {
          scientificName: primitives.scientificName
        })
    };
  }
};
