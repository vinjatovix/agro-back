export type PlantSowingPrimitives = {
  seedsPerHole: { min: number; max: number };
  germinationDays: { min: number; max: number };
  months: number[];
  methods: {
    direct: {
      depthCm: { min: number; max: number };
    };
    starter?: {
      depthCm: { min: number; max: number };
    };
  };
};
