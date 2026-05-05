import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import type { FamilyExtraPrimitives } from './FamilyExtraPrimitives.js';

export type FamilyProps = {
  id: Uuid;
  slug: string;
  name: string;
  aliases: string[];
  scientificName: string;
  shortDescription: string;
  highlights: string[];
  extra?: FamilyExtraPrimitives;
  metadata: Metadata;
};
