import { BasicSpatialService } from '../../../../../../../src/Contexts/Agro/Beds/domain/services/spatial/BasicSpatialService.js';
import type { SpatialPlantModel } from '../../../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';
import { createPlantCatalog } from '../../../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from '../../mothers/PlantInstanceMother.js';
import { SpatialTestScenarioBuilder } from '../../mothers/SpatialTestScenarioBuilder.js';
import { convertToSpatialPlant } from '../../../helpers/convertToSpatialPlant.js';

const { fixtures } = createPlantCatalog();

describe('BasicSpatialService', () => {
  const service = new BasicSpatialService();

  const bed = {
    width: 200,
    height: 200,
    plants: [] as SpatialPlantModel[]
  };

  const CROP = fixtures.tomato;
  const SPACING_CM = CROP.traits.spacingCm.max;

  describe('validatePlacement', () => {
    it('allows valid placement', () => {
      const { newPlant } = SpatialTestScenarioBuilder.safePlacement(
        bed,
        SPACING_CM
      );

      expect(() =>
        service.validatePlacement(
          bed,
          convertToSpatialPlant(newPlant(PlantInstanceMother, CROP), SPACING_CM)
        )
      ).not.toThrow();
    });

    it('rejects out of bounds (min limit)', () => {
      const build = SpatialTestScenarioBuilder.outOfBoundsMin();

      const plant = convertToSpatialPlant(
        build(PlantInstanceMother, CROP),
        SPACING_CM
      );

      expect(() => service.validatePlacement(bed, plant)).toThrow(
        'Plant out of bounds (min limit)'
      );
    });

    it('rejects out of bounds (max limit)', () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        CROP,
        bed.width + 1,
        bed.height + 1
      );

      const spatial = convertToSpatialPlant(plant, SPACING_CM);

      expect(() => service.validatePlacement(bed, spatial)).toThrow(
        'Plant out of bounds (max limit)'
      );
    });

    it('detects collision with existing plant', () => {
      const { existing, newPlant } =
        SpatialTestScenarioBuilder.colliding(SPACING_CM);

      const ctx = {
        ...bed,
        plants: [
          convertToSpatialPlant(existing(PlantInstanceMother, CROP), SPACING_CM)
        ]
      };

      const plant = convertToSpatialPlant(
        newPlant(PlantInstanceMother, CROP),
        SPACING_CM
      );

      expect(() => service.validatePlacement(ctx, plant)).toThrow(
        'Collision detected'
      );
    });

    it('ignores self but detects other collisions', () => {
      const plant = PlantInstanceMother.fromPlantAtPosition(
        CROP,
        SPACING_CM,
        SPACING_CM
      );

      const ctx = {
        ...bed,
        plants: [convertToSpatialPlant(plant, SPACING_CM)]
      };

      expect(() =>
        service.validatePlacement(ctx, convertToSpatialPlant(plant, SPACING_CM))
      ).not.toThrow();
    });

    it('detects collision in crowded environment', () => {
      const { existingPlants, newPlant } =
        SpatialTestScenarioBuilder.crowded(SPACING_CM);

      const ctx = {
        ...bed,
        plants: existingPlants(PlantInstanceMother, CROP).map((p) =>
          convertToSpatialPlant(p, SPACING_CM)
        )
      };

      const plant = convertToSpatialPlant(
        newPlant(PlantInstanceMother, fixtures.tomato),
        SPACING_CM
      );

      expect(() => service.validatePlacement(ctx, plant)).toThrow(
        'Collision detected'
      );
    });

    it('allows boundary-aligned placement', () => {
      const center = SPACING_CM / 2;

      const plant = convertToSpatialPlant(
        PlantInstanceMother.fromPlantAtPosition(
          fixtures.tomato,
          center,
          center
        ),
        SPACING_CM
      );

      expect(() => service.validatePlacement(bed, plant)).not.toThrow();
    });
  });
});
