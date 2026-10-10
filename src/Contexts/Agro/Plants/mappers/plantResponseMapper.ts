import type { Plant } from '../domain/entities/Plant.js';
import type {
  PlantImagePrimitives,
  PlantPrimitives
} from '../domain/entities/types/index.js';
import { plantDomainMapper } from './plantDomainMapper.js';

/** A plant as a write response sends it: primitives plus derived `image`. */
export type PlantWriteResponse = PlantPrimitives & {
  image: PlantImagePrimitives;
};

/**
 * Body of `POST /plants` and `PATCH /plants/{id}`. `image` is never stored,
 * so it is added here rather than in `plantDomainMapper.toPrimitives`, which
 * feeds persistence.
 */
export const toPlantResponse = (plant: Plant): PlantWriteResponse => ({
  ...plantDomainMapper.toPrimitives(plant),
  image: plant.primaryImage()
});
