import type { FamilyId } from '../../../../Families/domain/FamilyId.js';

export interface IdentityDomain {
  name: {
    primary: string;
    aliases?: string[];
  };
  family: FamilyId;
  scientificName?: string;
}
