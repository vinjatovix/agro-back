import type { PlantResourcePrimitives } from './PlantKnowledgePrimitives.js';

/** The plant's primary picture: the first `knowledge.resources` image. */
export type PlantImagePrimitives = Pick<
  PlantResourcePrimitives,
  'url' | 'title' | 'source'
>;
