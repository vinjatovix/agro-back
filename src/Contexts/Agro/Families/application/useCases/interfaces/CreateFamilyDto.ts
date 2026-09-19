import type { FamilyExtraPrimitives } from '../../../domain/types/FamilyExtraPrimitives.js';

export interface CreateFamilyDto {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  scientificName: string;
  shortDescription: string;
  highlights: string[];
  extra?: FamilyExtraPrimitives;
}
