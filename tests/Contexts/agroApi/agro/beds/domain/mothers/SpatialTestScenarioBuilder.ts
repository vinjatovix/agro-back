import type { PlantInstance } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import type { Plant } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';

type PlantFactory = {
  fromPlantAtPosition: (plant: Plant, x: number, y: number) => PlantInstance;
};

type Position = {
  x: number;
  y: number;
};

const spacingToStep = (spacing: number) => ({
  center: spacing / 2,
  safeDistance: spacing + 1,
  collisionDistance: spacing / 4
});

export const SpatialTestScenarioBuilder = {
  safePlacement(context: { width: number; height: number }, spacing: number) {
    const { center, safeDistance } = spacingToStep(spacing);

    const clampX = Math.min(center + safeDistance, context.width - center);

    const origin: Position = { x: center, y: center };
    const target: Position = { x: clampX, y: center };

    return {
      existing: (factory: PlantFactory, plant: Plant) =>
        factory.fromPlantAtPosition(plant, origin.x, origin.y),

      newPlant: (factory: PlantFactory, plant: Plant) =>
        factory.fromPlantAtPosition(plant, target.x, target.y)
    };
  },

  colliding(spacing: number) {
    const { center, collisionDistance } = spacingToStep(spacing);

    const origin: Position = { x: center, y: center };
    const target: Position = {
      x: center + collisionDistance,
      y: center + collisionDistance
    };

    return {
      existing: (factory: PlantFactory, plant: Plant) =>
        factory.fromPlantAtPosition(plant, origin.x, origin.y),

      newPlant: (factory: PlantFactory, plant: Plant) =>
        factory.fromPlantAtPosition(plant, target.x, target.y)
    };
  },

  outOfBoundsMin(spacing: number) {
    const { center } = spacingToStep(spacing);

    return (factory: PlantFactory, plant: Plant) =>
      factory.fromPlantAtPosition(plant, center - 1, center - 1);
  },

  outOfBoundsMax(context: { width: number; height: number }, spacing: number) {
    const { center } = spacingToStep(spacing);

    return (factory: PlantFactory, plant: Plant) =>
      factory.fromPlantAtPosition(
        plant,
        context.width - center + 1,
        context.height - center + 1
      );
  },

  crowded(spacing: number, layout: 'grid' | 'line' = 'grid') {
    const { center } = spacingToStep(spacing);

    const base = center;

    const offsets =
      layout === 'grid'
        ? [
            { x: 0, y: 0 },
            { x: spacing, y: 0 },
            { x: spacing * 2, y: spacing },
            { x: spacing * 3, y: spacing * 2 }
          ]
        : [
            { x: 0, y: 0 },
            { x: spacing, y: 0 },
            { x: spacing * 2, y: 0 }
          ];

    return {
      existing: (factory: PlantFactory, plant: Plant) =>
        factory.fromPlantAtPosition(plant, base, base),

      extraPlants: (factory: PlantFactory, plant: Plant) =>
        offsets.map((o) =>
          factory.fromPlantAtPosition(plant, base + o.x, base + o.y)
        )
    };
  }
};
