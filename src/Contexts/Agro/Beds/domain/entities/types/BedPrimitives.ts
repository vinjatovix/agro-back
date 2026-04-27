import type { PlantInstancePrimitives } from './PlantInstancePrimitives.js';

export type BedPrimitives = {
  id: string;
  width: number;
  height: number;
  plantInstances: PlantInstancePrimitives[];
};
