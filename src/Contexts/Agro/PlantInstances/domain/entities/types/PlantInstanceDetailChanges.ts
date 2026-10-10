import type { CropGrowthStatus } from './CropGrowthStatus.js';

/** PATCH changes: an absent field is kept, `null` clears it. */
export type PlantInstanceDetailChanges = {
  growthStatus?: CropGrowthStatus | undefined;
  variety?: string | null | undefined;
  notes?: string | null | undefined;
};
