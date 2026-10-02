import type { Seasons } from './Seasons.js';

export type PruningTypePrimitives = {
  type: 'maintenance' | 'rejuvenation' | 'shaping' | (string & {});
  intensity: 'light' | 'moderate' | 'hard' | (string & {});
  seasons: Seasons[];
  frequencyPerYear: number;
  bestPractices?: string[];
};
