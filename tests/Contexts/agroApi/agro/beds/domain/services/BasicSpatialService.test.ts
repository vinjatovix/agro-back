import type { PlantInstance } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import { BasicSpatialService } from '../../../../../../../src/Contexts/agroApi/agro/beds/domain/services/BasicSpatialService.js';
import { createPlantCatalog } from '../../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';

const { plantRepository } = createPlantCatalog();

describe('BasicSpatialService', () => {
  const service = new BasicSpatialService();

  const baseContext = {
    width: 200,
    height: 200,
    plants: [] as PlantInstance[]
  };

  describe('validatePlacement', () => {
    it('should allow valid placement', () => {
      const plant = PlantInstanceMother.atPosition(50, 50);

      expect(() => {
        service.validatePlacement(baseContext, plant, plantRepository);
      }).not.toThrow();
    });

    it('should throw when plant is out of bounds (min limit)', () => {
      const plant = PlantInstanceMother.atPosition(5, 5);

      expect(() => {
        service.validatePlacement(baseContext, plant, plantRepository);
      }).toThrow('Plant out of bounds (min limit)');
    });

    it('should throw when plant is out of bounds (max limit)', () => {
      const plant = PlantInstanceMother.atPosition(195, 195);

      expect(() => {
        service.validatePlacement(baseContext, plant, plantRepository);
      }).toThrow('Plant out of bounds (max limit)');
    });

    it('should throw on collision between plants', () => {
      const existing = PlantInstanceMother.atPosition(50, 50);
      const newPlant = PlantInstanceMother.atPosition(55, 55);

      const context = {
        ...baseContext,
        plants: [existing]
      };

      expect(() => {
        service.validatePlacement(context, newPlant, plantRepository);
      }).toThrow('Collision detected');
    });

    it('should allow placement when distance is safe', () => {
      const existing = PlantInstanceMother.atPosition(50, 50);
      const newPlant = PlantInstanceMother.atPosition(80, 50);

      const context = {
        ...baseContext,
        plants: [existing]
      };

      expect(() => {
        service.validatePlacement(context, newPlant, plantRepository);
      }).not.toThrow();
    });

    it('should ignore self in collision detection', () => {
      const plant = PlantInstanceMother.atPosition(50, 50);

      const context = {
        ...baseContext,
        plants: [plant]
      };

      expect(() => {
        service.validatePlacement(context, plant, plantRepository);
      }).not.toThrow();
    });
  });

  it('should allow placement when plants are exactly touching', () => {
    const existing = PlantInstanceMother.atPosition(50, 50);
    const newPlant = PlantInstanceMother.atPosition(70, 50); // 20 = 10 + 10

    const context = {
      ...baseContext,
      plants: [existing]
    };

    expect(() => {
      service.validatePlacement(context, newPlant, plantRepository);
    }).not.toThrow();
  });

  it('should detect collision with any existing plant', () => {
    const plants = [
      PlantInstanceMother.atPosition(20, 20),
      PlantInstanceMother.atPosition(50, 50),
      PlantInstanceMother.atPosition(100, 100)
    ];

    const newPlant = PlantInstanceMother.atPosition(55, 55);

    const context = {
      ...baseContext,
      plants
    };

    expect(() => {
      service.validatePlacement(context, newPlant, plantRepository);
    }).toThrow('Collision detected');
  });

  it('should allow placement exactly on the boundary edge', () => {
    const plant = PlantInstanceMother.atPosition(10, 10); // radius = 10

    expect(() => {
      service.validatePlacement(baseContext, plant, plantRepository);
    }).not.toThrow();
  });
});
