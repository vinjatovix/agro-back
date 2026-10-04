import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import {
  toSparseView,
  type ReadViewFieldMappers
} from '../../../../../shared/infrastructure/persistence/mongo/readViewFields.js';
import type {
  PlantField,
  PlantReadView,
  PlantSparseView
} from '../../../application/queries/PlantReadView.js';
import type { PlantStatus } from '../../../domain/entities/types/PlantStatus.js';
import type { MongoPlantDocument } from '../types/MongoPlantDocument.js';

/** A stored plant as it may be found: legacy documents miss some fields. */
export type StoredPlantDocument = Omit<
  MongoPlantDocument,
  'version' | 'status'
> & {
  version?: number;
  status?: PlantStatus;
};

// Defaults reproduce what the aggregate round-trip sent before the read
// bypass, so response bodies stay the same (guarded by a parity test).

const DEFAULT_STATUS: PlantReadView['status'] = 'ACTIVE';

const toMetadata = (metadata: MetadataPrimitives): MetadataPrimitives => ({
  createdAt: new Date(metadata.createdAt),
  createdBy: metadata.createdBy,
  updatedAt: new Date(metadata.updatedAt),
  updatedBy: metadata.updatedBy
});

const toDeletedAt = (deletedAt: unknown): string | null => {
  if (deletedAt instanceof Date) return deletedAt.toISOString();

  return typeof deletedAt === 'string' && deletedAt !== '' ? deletedAt : null;
};

/** How each read-view field comes from a stored plant. */
const PLANT_VIEW_FIELDS: ReadViewFieldMappers<
  StoredPlantDocument,
  PlantReadView
> = {
  id: (document) => fromMongoId(document._id),
  identity: (document) => document.identity,
  traits: (document) => document.traits,
  phenology: (document) => document.phenology,
  knowledge: (document) => document.knowledge ?? {},
  metadata: (document) => toMetadata(document.metadata),
  status: (document) => document.status ?? DEFAULT_STATUS,
  deletedAt: (document) => toDeletedAt(document.deletedAt),
  version: (document) => document.version ?? 0
};

/** Stored plant → read view; copies stored values, builds no aggregate. */
export const toPlantReadView = (
  document: StoredPlantDocument
): PlantReadView => ({
  id: PLANT_VIEW_FIELDS.id(document),
  version: PLANT_VIEW_FIELDS.version(document),
  identity: PLANT_VIEW_FIELDS.identity(document),
  traits: PLANT_VIEW_FIELDS.traits(document),
  phenology: PLANT_VIEW_FIELDS.phenology(document),
  knowledge: PLANT_VIEW_FIELDS.knowledge(document),
  metadata: PLANT_VIEW_FIELDS.metadata(document),
  status: PLANT_VIEW_FIELDS.status(document),
  deletedAt: PLANT_VIEW_FIELDS.deletedAt(document)
});

/**
 * Stored plant read with a fieldset → `id` plus the selected fields, with the
 * same defaults as the full view.
 */
export const toPlantSparseView = (
  document: StoredPlantDocument,
  fields: readonly PlantField[]
): PlantSparseView => toSparseView(PLANT_VIEW_FIELDS, document, fields);
