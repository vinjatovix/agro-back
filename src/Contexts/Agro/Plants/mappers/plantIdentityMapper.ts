import {
  createFamilyId,
  type FamilyId
} from '../../Families/domain/FamilyId.js';

export interface IdentityPrimitives {
  name: {
    primary: string;
    aliases?: string[];
  };
  family: string;
  scientificName?: string | null;
}

export interface IdentityDomain {
  name: {
    primary: string;
    aliases?: string[];
  };
  family: FamilyId;
  scientificName?: string;
}

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
