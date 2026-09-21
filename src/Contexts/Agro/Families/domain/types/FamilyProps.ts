import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { FamilyId } from '../FamilyId.js';
import type { FamilyExtraPrimitives } from './FamilyExtraPrimitives.js';

export type FamilyProps = {
  id: FamilyId;
  slug: string;
  name: string;
  aliases: string[];
  scientificName: string;
  shortDescription: string;
  highlights: string[];
  extra?: FamilyExtraPrimitives;
  metadata: Metadata;
};
