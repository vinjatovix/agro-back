import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { FamilyExtraPrimitives } from '../../../domain/types/FamilyExtraPrimitives.js';

export type MongoFamilyDocument = {
  _id: string | Binary | UUID;
  slug: string;
  name: string;
  aliases: string[];
  scientificName: string;
  shortDescription: string;
  highlights: string[];
  extra?: FamilyExtraPrimitives;
  metadata: MetadataPrimitives;
  version: number;
};
