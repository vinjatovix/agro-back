import { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { createPlantCatalog } from '../../helpers/InMemoryPlantRepository.js';
import {
  PlantInstanceMother,
  SpatialTestScenarioBuilder
} from '../mothers/index.js';
import type { SpatialPlantModel } from '../../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';

const { fixtures } = createPlantCatalog();

describe('Bed + SpatialService (integration)', () => {
  const createBed = () =>
    new Bed(UuidMother.random(), {
      width: 200,
      height: 200,
      plantInstances: []
    });

  const CROP = fixtures.tomato;
  const SPACING_CM = CROP.traits.spacingCm.max;

  const createSpatialPlant = (
    plant: ReturnType<typeof PlantInstanceMother.fromPlantAtPosition>,
    spacingCm = SPACING_CM
  ): SpatialPlantModel => ({
    id: plant.id.value,
    plantId: plant.plantId.value,
    position: {
      x: plant.position.x,
      y: plant.position.y
    },
    spacingCm
  });

  it('accepts multiple non-colliding plant placements', () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      SPACING_CM
    );

    const p1 = existing(PlantInstanceMother, CROP);
    const p2 = newPlant(PlantInstanceMother, CROP);

    const s1 = createSpatialPlant(p1);
    const s2 = createSpatialPlant(p2);

    bed.addPlant(p1, s1, []);
    bed.addPlant(p2, s2, [s1]);

    expect(bed.plants).toHaveLength(2);
  });

  it('prevents adding a colliding plant', () => {
    const bed = createBed();

    const { existing, newPlant } =
      SpatialTestScenarioBuilder.colliding(SPACING_CM);

    const p1 = existing(PlantInstanceMother, CROP);
    const p2 = newPlant(PlantInstanceMother, CROP);

    const s1 = createSpatialPlant(p1);
    const s2 = createSpatialPlant(p2);

    bed.addPlant(p1, s1, []);

    expect(() => bed.addPlant(p2, s2, [s1])).toThrow('Collision detected');

    expect(bed.plants).toHaveLength(1);
  });

  it('rejects plant positioned outside minimum bounds', () => {
    const bed = createBed();

    const plant = SpatialTestScenarioBuilder.outOfBoundsMin()(
      PlantInstanceMother,
      CROP
    );

    const spatial = createSpatialPlant(plant);

    expect(() => bed.addPlant(plant, spatial, [])).toThrow(
      'Plant out of bounds (min limit)'
    );

    expect(bed.plants).toHaveLength(0);
  });

  it('allows plants exactly touching boundaries', () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      SPACING_CM
    );

    const p1 = existing(PlantInstanceMother, CROP);
    const p2 = newPlant(PlantInstanceMother, CROP);

    const s1 = createSpatialPlant(p1);
    const s2 = createSpatialPlant(p2);

    bed.addPlant(p1, s1, []);
    bed.addPlant(p2, s2, [s1]);

    expect(bed.plants).toHaveLength(2);
  });

  it('allows planting exactly at minimum boundary radius', () => {
    const bed = createBed();

    const center = SPACING_CM / 2;

    const plant = PlantInstanceMother.fromPlantAtPosition(CROP, center, center);

    const spatial = createSpatialPlant(plant);

    bed.addPlant(plant, spatial, []);

    expect(bed.plants).toHaveLength(1);
  });

  it('continues working after removing a plant', () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      SPACING_CM
    );

    const p1 = existing(PlantInstanceMother, CROP);
    const p2 = newPlant(PlantInstanceMother, CROP);

    const s1 = createSpatialPlant(p1);
    const s2 = createSpatialPlant(p2);

    bed.addPlant(p1, s1, []);
    bed.removePlant(p1.id);

    expect(() => bed.addPlant(p2, s2, [])).not.toThrow();

    expect(bed.plants).toHaveLength(1);
  });

  it('rejects plants at exact collision distance threshold', () => {
    const bed = createBed();

    const base = PlantInstanceMother.fromPlantAtPosition(CROP, 100, 100);

    const near = PlantInstanceMother.fromPlantAtPosition(
      CROP,
      100 + SPACING_CM,
      100
    );

    const s1 = createSpatialPlant(base);
    const s2 = createSpatialPlant(near);

    bed.addPlant(base, s1, []);

    expect(() => bed.addPlant(near, s2, [s1])).toThrow('Collision detected');
  });

  it('ignores same plant instance in collision detection', () => {
    const bed = createBed();

    const plant = PlantInstanceMother.fromPlantAtPosition(CROP, 100, 100);

    const spatial = createSpatialPlant(plant);

    bed.addPlant(plant, spatial, [spatial]);

    expect(bed.plants).toHaveLength(1);
  });

  it('does not mutate state when validation fails', () => {
    const bed = createBed();

    const { existing, newPlant } =
      SpatialTestScenarioBuilder.colliding(SPACING_CM);

    const p1 = existing(PlantInstanceMother, CROP);
    const p2 = newPlant(PlantInstanceMother, CROP);

    const s1 = createSpatialPlant(p1);
    const s2 = createSpatialPlant(p2);

    bed.addPlant(p1, s1, []);

    expect(() => bed.addPlant(p2, s2, [s1])).toThrow('Collision detected');

    expect(bed.plants).toHaveLength(1);
  });

  it('validates collisions against full existing spatial context', () => {
    const bed = createBed();

    const plant1 = PlantInstanceMother.fromPlantAtPosition(CROP, 50, 50);
    const plant2 = PlantInstanceMother.fromPlantAtPosition(CROP, 150, 50);
    const newPlant = PlantInstanceMother.fromPlantAtPosition(CROP, 100, 50);

    const s1 = createSpatialPlant(plant1, SPACING_CM);
    const s2 = createSpatialPlant(plant2, SPACING_CM);
    const sNew = createSpatialPlant(newPlant, SPACING_CM);

    bed.addPlant(plant1, s1, []);
    bed.addPlant(plant2, s2, [s1]);

    expect(() => bed.addPlant(newPlant, sNew, [s1, s2])).toThrow(
      'Collision detected'
    );

    expect(bed.plants).toHaveLength(2);
  });
});
