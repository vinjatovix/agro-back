import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from './MetadataPrimitives.js';

export type Entity = {
  _id: string | Binary | UUID;
  metadata: MetadataPrimitives;
};
