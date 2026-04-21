import type { PlantInstancePrimitives } from '../entities/interfaces/PlantInstancePrimitives.js';

export interface BedPrimitives {
  id: string;
  width: number;
  height: number;
  plantInstances: PlantInstancePrimitives[];
}
