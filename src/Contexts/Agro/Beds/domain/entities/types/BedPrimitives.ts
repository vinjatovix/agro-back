import type { PlantInstancePrimitives } from '../../../../PlantInstances/domain/entities/types/PlantInstancePrimitives.js';

export type BedPrimitives = {
  id: string;
  width: number;
  height: number;
  plantInstances: PlantInstancePrimitives[];
};
