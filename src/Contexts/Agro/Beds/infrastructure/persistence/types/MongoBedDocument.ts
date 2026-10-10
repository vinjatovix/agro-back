import type { Binary, UUID } from 'mongodb';
import type { BedPrimitives } from '../../../domain/entities/types/BedPrimitives.js';

export type MongoBedDocument = {
  _id: string | Binary | UUID;
  userId: string | Binary | UUID;
  name: string;
  width: number;
  height: number;
  depth: number;
  metadata: BedPrimitives['metadata'];
  deleted: boolean;
  deletedAt?: string;
  version: number;
};
