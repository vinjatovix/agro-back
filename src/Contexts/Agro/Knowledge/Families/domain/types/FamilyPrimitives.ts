import type { MetadataPrimitives } from '../../../../../shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js';
import type { FamilyExtraPrimitives } from './FamilyExtraPrimitives.js';

export type FamilyPrimitives = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  scientificName: string;
  shortDescription: string;
  highlights: string[];
  extra?: FamilyExtraPrimitives;
  metadata: MetadataPrimitives;
};
