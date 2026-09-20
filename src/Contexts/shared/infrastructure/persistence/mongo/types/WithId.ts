import type { MetadataPrimitives } from '../../../../domain/MetadataPrimitives.js';

export type WithId = {
  id: string;
  metadata: MetadataPrimitives;
};
