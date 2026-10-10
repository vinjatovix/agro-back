export const PLANT_RESOURCE_TYPES = ['image', 'article', 'video'] as const;

export type PlantResourceType = (typeof PLANT_RESOURCE_TYPES)[number];
