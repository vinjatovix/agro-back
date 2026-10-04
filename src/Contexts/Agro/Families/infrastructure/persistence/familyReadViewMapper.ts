import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import {
  toSparseView,
  type ReadViewFieldMappers
} from '../../../../shared/infrastructure/persistence/mongo/readViewFields.js';
import type {
  FamilyField,
  FamilyReadView,
  FamilySparseView
} from '../../application/queries/FamilyReadView.js';
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

/** How each read-view field comes from a stored family. */
const FAMILY_VIEW_FIELDS: ReadViewFieldMappers<
  StoredFamilyDocument,
  FamilyReadView
> = {
  id: (document) => fromMongoId(document._id),
  slug: (document) => document.slug,
  name: (document) => document.name,
  aliases: (document) => document.aliases,
  scientificName: (document) => document.scientificName,
  shortDescription: (document) => document.shortDescription,
  highlights: (document) => document.highlights,
  extra: (document) => toExtra(document.extra),
  metadata: (document) => toMetadata(document.metadata),
  version: (document) => document.version ?? 0
};

/** Stored family → read view; copies stored values, builds no aggregate. */
export const toFamilyReadView = (
  document: StoredFamilyDocument
): FamilyReadView => {
  const extra = FAMILY_VIEW_FIELDS.extra(document);

  return {
    id: FAMILY_VIEW_FIELDS.id(document),
    slug: FAMILY_VIEW_FIELDS.slug(document),
    name: FAMILY_VIEW_FIELDS.name(document),
    aliases: FAMILY_VIEW_FIELDS.aliases(document),
    scientificName: FAMILY_VIEW_FIELDS.scientificName(document),
    shortDescription: FAMILY_VIEW_FIELDS.shortDescription(document),
    highlights: FAMILY_VIEW_FIELDS.highlights(document),
    ...(extra ? { extra } : {}),
    metadata: FAMILY_VIEW_FIELDS.metadata(document),
    version: FAMILY_VIEW_FIELDS.version(document)
  };
};

/**
 * Stored family read with a fieldset → `id` plus the selected fields; `extra`
 * stays absent when the family has none.
 */
export const toFamilySparseView = (
  document: StoredFamilyDocument,
  fields: readonly FamilyField[]
): FamilySparseView => toSparseView(FAMILY_VIEW_FIELDS, document, fields);
