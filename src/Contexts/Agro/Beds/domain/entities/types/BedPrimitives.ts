import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';

export type BedPrimitives = {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  metadata: MetadataPrimitives;
  deleted: boolean;
  deletedAt?: string;
  version: number;
};
