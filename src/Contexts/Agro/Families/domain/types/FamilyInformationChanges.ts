import type { FamilyExtraChanges } from './FamilyExtraChanges.js';

export type FamilyInformationChanges = {
  slug?: string;
  name?: string;
  aliases?: string[];
  scientificName?: string;
  shortDescription?: string;
  highlights?: string[];
  extra?: FamilyExtraChanges | null;
};
