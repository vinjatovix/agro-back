import type { Seasons } from './Seasons.js';

export type PruningTypePrimitives = {
  type: 'maintenance' | 'rejuvenation' | 'shaping' | (string & {});
  intensity: 'light' | 'moderate' | 'hard' | (string & {});
  season: Seasons;
  frequencyPerYear: number;
  bestPractices?: string[];
};
