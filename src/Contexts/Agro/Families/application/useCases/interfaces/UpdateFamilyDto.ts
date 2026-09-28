import type { FamilyExtraChanges } from '../../../domain/types/FamilyExtraChanges.js';

export interface UpdateFamilyDto {
  slug?: string;
  name?: string;
  aliases?: string[];
  scientificName?: string;
  shortDescription?: string;
  highlights?: string[];
  extra?: FamilyExtraChanges | null;
}
