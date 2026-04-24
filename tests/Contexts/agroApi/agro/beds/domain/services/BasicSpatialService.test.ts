import type { PlantInstance } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { BasicSpatialService } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/services/BasicSpatialService.js';
import { createPlantCatalog } from '../../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';
import { SpatialTestScenarioBuilder } from '../mothers/SpatialTestScenarioBuilder.js';

const { plantRepository, fixtures } = createPlantCatalog();

describe('BasicSpatialService', () => {
  const service = new BasicSpatialService();

  const bed = {
    width: 200,
    height: 200,
    plants: [] as PlantInstance[]
  };

  const tomatoSafeSpacingInCm = fixtures.tomato.traits.spacingCm.max;

  describe('validatePlacement', () => {
    it('allows valid placement', async () => {
      const { newPlant } = SpatialTestScenarioBuilder.safePlacement(
        bed,
        tomatoSafeSpacingInCm
      );

      await expect(
        service.validatePlacement(
          bed,
          newPlant(PlantInstanceMother, fixtures.tomato),
          plantRepository
        )
      ).resolves.toBeUndefined();
    });

    it('rejects out of bounds (min limit)', async () => {
      const build = SpatialTestScenarioBuilder.outOfBoundsMin(
        tomatoSafeSpacingInCm
      );

      const plant = build(PlantInstanceMother, fixtures.tomato);

      await expect(
        service.validatePlacement(bed, plant, plantRepository)
      ).rejects.toThrow('Plant out of bounds (min limit)');
    });

    it('rejects out of bounds (max limit)', async () => {
      const build = SpatialTestScenarioBuilder.outOfBoundsMax(
        bed,
        tomatoSafeSpacingInCm
      );

      const plant = build(PlantInstanceMother, fixtures.tomato);

      await expect(
        service.validatePlacement(bed, plant, plantRepository)
      ).rejects.toThrow('Plant out of bounds (max limit)');
    });

    it('detects collision with existing plant', async () => {
      const { existing, newPlant } = SpatialTestScenarioBuilder.colliding(
        tomatoSafeSpacingInCm
      );

      const ctx = {
        ...bed,
        plants: [existing(PlantInstanceMother, fixtures.tomato)]
      };

      await expect(
        service.validatePlacement(
          ctx,
          newPlant(PlantInstanceMother, fixtures.tomato),
          plantRepository
        )
      ).rejects.toThrow('Collision detected');
    });

    it('ignores self but detects other collisions', async () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        tomatoSafeSpacingInCm,
        tomatoSafeSpacingInCm
      );

      const ctx = {
        ...bed,
        plants: [plant]
      };

      await expect(
        service.validatePlacement(ctx, plant, plantRepository)
      ).resolves.toBeUndefined();
    });

    it('detects collision in crowded environment', async () => {
      const { existing, newPlant } = SpatialTestScenarioBuilder.colliding(
        tomatoSafeSpacingInCm
      );

      const ctx = {
        ...bed,
        plants: [
          existing(PlantInstanceMother, fixtures.tomato),
          PlantInstanceMother.fromPlantAtPosition(fixtures.tomato, 120, 120),
          PlantInstanceMother.fromPlantAtPosition(fixtures.tomato, 160, 160)
        ]
      };

      await expect(
        service.validatePlacement(
          ctx,
          newPlant(PlantInstanceMother, fixtures.tomato),
          plantRepository
        )
      ).rejects.toThrow('Collision detected');
    });

    it('allows boundary-aligned placement', async () => {
      const center = tomatoSafeSpacingInCm / 2;

      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        center,
        center
      );

      await expect(
        service.validatePlacement(bed, plant, plantRepository)
      ).resolves.toBeUndefined();
    });
  });
});
