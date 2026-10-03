import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import type { PlantReadView } from '../../../application/queries/PlantReadView.js';
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

/** Stored plant → read view; copies stored values, builds no aggregate. */
export const toPlantReadView = (
  document: StoredPlantDocument
): PlantReadView => ({
  id: fromMongoId(document._id),
  version: document.version ?? 0,
  identity: document.identity,
  traits: document.traits,
  phenology: document.phenology,
  knowledge: document.knowledge ?? {},
  metadata: toMetadata(document.metadata),
  status: document.status ?? DEFAULT_STATUS,
  deletedAt: toDeletedAt(document.deletedAt)
});
