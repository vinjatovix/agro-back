import type { PlantInstance } from '../entities/PlantInstance.js';

export interface BedProps {
  width: number;
  height: number;
  plantInstances?: PlantInstance[];
}
