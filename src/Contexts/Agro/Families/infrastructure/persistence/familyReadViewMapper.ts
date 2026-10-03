import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import type { FamilyReadView } from '../../application/queries/FamilyReadView.js';
import type { FamilyExtraPrimitives } from '../../domain/types/FamilyExtraPrimitives.js';
import type { MongoFamilyDocument } from './types/MongoFamilyDocument.js';

/** A stored family as it may be found: legacy documents miss `version`. */
export type StoredFamilyDocument = Omit<MongoFamilyDocument, 'version'> & {
  version?: number;
};

// Same output as the aggregate round-trip it replaces (guarded by a parity
// test): dates as `Date`, missing version read as 0, no `extra` key when the
// family has no known `extra` field.

const toMetadata = (metadata: MetadataPrimitives): MetadataPrimitives => ({
  createdAt: new Date(metadata.createdAt),
  createdBy: metadata.createdBy,
  updatedAt: new Date(metadata.updatedAt),
  updatedBy: metadata.updatedBy
});

/** Known `extra` fields only; with none left it is absent, as in the domain. */
const toExtra = (
  extra: FamilyExtraPrimitives | undefined
): FamilyExtraPrimitives | undefined => {
  if (!extra) return undefined;

  const known: FamilyExtraPrimitives = {};
  if (extra.order !== undefined) known.order = extra.order;
  if (extra.subfamilies !== undefined) known.subfamilies = extra.subfamilies;
  if (extra.distribution !== undefined) known.distribution = extra.distribution;
  if (extra.speciesCount !== undefined) known.speciesCount = extra.speciesCount;

  return Object.keys(known).length ? known : undefined;
};

/** Stored family → read view; copies stored values, builds no aggregate. */
export const toFamilyReadView = (
  document: StoredFamilyDocument
): FamilyReadView => {
  const extra = toExtra(document.extra);

  return {
    id: fromMongoId(document._id),
    slug: document.slug,
    name: document.name,
    aliases: document.aliases,
    scientificName: document.scientificName,
    shortDescription: document.shortDescription,
    highlights: document.highlights,
    ...(extra ? { extra } : {}),
    metadata: toMetadata(document.metadata),
    version: document.version ?? 0
  };
};
