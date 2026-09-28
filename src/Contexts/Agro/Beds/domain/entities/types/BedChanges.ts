import type { BedDimensionsChanges } from './BedDimensionsChanges.js';

export type BedChanges = {
  name?: string;
  dimensions: BedDimensionsChanges;
};
