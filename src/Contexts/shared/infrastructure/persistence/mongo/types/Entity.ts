import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../domain/MetadataPrimitives.js';

export type Entity = {
  _id: string | Binary | UUID;
  metadata: MetadataPrimitives;
};
