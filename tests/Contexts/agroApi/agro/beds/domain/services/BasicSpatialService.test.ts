import type { PlantInstance } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { BasicSpatialService } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/services/BasicSpatialService.js';
import { createPlantCatalog } from '../../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';

const { plantRepository, fixtures } = createPlantCatalog();

describe('BasicSpatialService', () => {
  const service = new BasicSpatialService();

  const baseContext = {
    width: 200,
    height: 200,
    plants: [] as PlantInstance[]
  };

  describe('validatePlacement', () => {
    it('should allow valid placement', async () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        50,
        50
      );

      await expect(
        service.validatePlacement(baseContext, plant, plantRepository)
      ).resolves.toBeUndefined();
    });

    it('should throw when plant is out of bounds (min limit)', async () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        5,
        5
      );

      await expect(
        service.validatePlacement(baseContext, plant, plantRepository)
      ).rejects.toThrow('Plant out of bounds (min limit)');
    });

    it('should throw when plant is out of bounds (max limit)', async () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        195,
        195
      );

      await expect(
        service.validatePlacement(baseContext, plant, plantRepository)
      ).rejects.toThrow('Plant out of bounds (max limit)');
    });

    it('should throw on collision between plants', async () => {
      const existing = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        50,
        50
      );
      const newPlant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        55,
        55
      );

      const context = {
        ...baseContext,
        plants: [existing]
      };

      await expect(
        service.validatePlacement(context, newPlant, plantRepository)
      ).rejects.toThrow('Collision detected');
    });

    it('should allow placement when distance is safe', async () => {
      const existing = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        50,
        50
      );
      const newPlant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        80,
        50
      );

      const context = {
        ...baseContext,
        plants: [existing]
      };

      await expect(
        service.validatePlacement(context, newPlant, plantRepository)
      ).resolves.toBeUndefined();
    });

    it('should ignore self in collision detection', async () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        fixtures.tomato,
        50,
        50
      );

      const context = {
        ...baseContext,
        plants: [plant]
      };

      await expect(
        service.validatePlacement(context, plant, plantRepository)
      ).resolves.toBeUndefined();
    });
  });

  it('should allow placement when plants are exactly touching', async () => {
    const existing = PlantInstanceMother.fromPlantAtPosition(
      fixtures.tomato,
      50,
      50
    );
    const newPlant = PlantInstanceMother.fromPlantAtPosition(
      fixtures.tomato,
      70,
      50
    );

    const context = {
      ...baseContext,
      plants: [existing]
    };

    await expect(
      service.validatePlacement(context, newPlant, plantRepository)
    ).resolves.toBeUndefined();
  });

  it('should detect collision with any existing plant', async () => {
    const plants = [
      PlantInstanceMother.fromPlantAtPosition(fixtures.tomato, 20, 20),
      PlantInstanceMother.fromPlantAtPosition(fixtures.tomato, 50, 50),
      PlantInstanceMother.fromPlantAtPosition(fixtures.tomato, 100, 100)
    ];

    const newPlant = PlantInstanceMother.fromPlantAtPosition(
      fixtures.tomato,
      55,
      55
    );

    const context = {
      ...baseContext,
      plants
    };

    await expect(
      service.validatePlacement(context, newPlant, plantRepository)
    ).rejects.toThrow('Collision detected');
  });

  it('should allow placement exactly on the boundary edge', async () => {
    const plant = PlantInstanceMother.fromPlantAtPosition(
      fixtures.tomato,
      10,
      10
    );

    await expect(
      service.validatePlacement(baseContext, plant, plantRepository)
    ).resolves.toBeUndefined();
  });
});
