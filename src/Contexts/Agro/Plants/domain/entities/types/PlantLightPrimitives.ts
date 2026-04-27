export type PlantLightPrimitives = {
  hoursMin: number;
  type: 'full_sun' | 'partial_shade' | 'full_shade' | (string & {});
  preference?: 'morning' | 'afternoon' | 'all_day' | (string & {});
};
