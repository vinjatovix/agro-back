import type { PlantInstance } from '../PlantInstance.js';

export type BedProps = {
  width: number;
  height: number;
  plantInstances?: PlantInstance[];
};
