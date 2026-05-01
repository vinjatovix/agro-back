import type { PlantInstance } from '../../../../PlantInstances/domain/entities/PlantInstance.js';

export type BedProps = {
  width: number;
  height: number;
  plantInstances?: PlantInstance[];
};
