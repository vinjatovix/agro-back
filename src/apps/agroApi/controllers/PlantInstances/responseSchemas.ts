import { z } from 'zod';
import { metadataResponseSchema } from '../../shared/responseSchemas.js';

export const coordinatesResponseSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0)
});

export const plantInstanceResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  bedId: z.uuid(),
  plantId: z.uuid(),
  position: coordinatesResponseSchema.exactOptional(),
  growthStatus: z.enum(['seeded', 'planted', 'growing', 'harvested']),
  instanceStatus: z.enum(['active', 'removed']),
  plantedAt: z.iso.datetime(),
  removedAt: z.iso.datetime().exactOptional(),
  variety: z.string().exactOptional(),
  notes: z.string().exactOptional(),
  metadata: metadataResponseSchema,
  version: z.number().int().min(0)
});

export type PlantInstanceResponse = z.output<
  typeof plantInstanceResponseSchema
>;
