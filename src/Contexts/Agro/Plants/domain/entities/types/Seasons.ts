export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export type Seasons = (typeof SEASONS)[number];
