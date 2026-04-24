import { Bed } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/Bed.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { createPlantCatalog } from '../helpers/InMemoryPlantRepository.js';
import { PlantInstanceMother } from './mothers/PlantInstanceMother.js';
import { SpatialTestScenarioBuilder } from './mothers/SpatialTestScenarioBuilder.js';

const { plantRepository, fixtures } = createPlantCatalog();

describe('Bed + SpatialService (integration)', () => {
  const createBed = () =>
    new Bed(UuidMother.random(), {
      width: 200,
      height: 200,
      plantInstances: []
    });

  const spacing = fixtures.tomato.traits.spacingCm.max;

  it('adds multiple plants when placement is valid', async () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      spacing
    );

    const p1 = existing(PlantInstanceMother, fixtures.tomato);
    const p2 = newPlant(PlantInstanceMother, fixtures.tomato);

    await bed.addPlant(p1, plantRepository);
    await bed.addPlant(p2, plantRepository);

    expect(bed.plants).toHaveLength(2);
  });

  it('prevents adding a colliding plant', async () => {
    const bed = createBed();

    const { existing, newPlant } =
      SpatialTestScenarioBuilder.colliding(spacing);

    const p1 = existing(PlantInstanceMother, fixtures.tomato);
    const p2 = newPlant(PlantInstanceMother, fixtures.tomato);

    await bed.addPlant(p1, plantRepository);

    await expect(bed.addPlant(p2, plantRepository)).rejects.toThrow(
      'Collision detected'
    );

    expect(bed.plants).toHaveLength(1);
  });

  it('prevents adding a plant outside bounds', async () => {
    const bed = createBed();

    const plant = SpatialTestScenarioBuilder.outOfBoundsMin(spacing)(
      PlantInstanceMother,
      fixtures.tomato
    );

    await expect(bed.addPlant(plant, plantRepository)).rejects.toThrow(
      'Plant out of bounds (min limit)'
    );

    expect(bed.plants).toHaveLength(0);
  });

  it('allows plants exactly touching boundaries', async () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      spacing
    );

    await bed.addPlant(
      existing(PlantInstanceMother, fixtures.tomato),
      plantRepository
    );
    await bed.addPlant(
      newPlant(PlantInstanceMother, fixtures.tomato),
      plantRepository
    );

    expect(bed.plants).toHaveLength(2);
  });

  it('allows planting on boundary edge', async () => {
    const bed = createBed();

    const center = spacing / 2;

    const plant = PlantInstanceMother.fromPlantAtPosition(
      fixtures.tomato,
      center,
      center
    );

    await bed.addPlant(plant, plantRepository);

    expect(bed.plants).toHaveLength(1);
  });

  it('continues working after removing a plant', async () => {
    const bed = createBed();

    const { existing, newPlant } = SpatialTestScenarioBuilder.safePlacement(
      bed,
      spacing
    );

    const p1 = existing(PlantInstanceMother, fixtures.tomato);
    const p2 = newPlant(PlantInstanceMother, fixtures.tomato);

    await bed.addPlant(p1, plantRepository);
    bed.removePlant(p1.id);

    await expect(bed.addPlant(p2, plantRepository)).resolves.not.toThrow();

    expect(bed.plants).toHaveLength(1);
  });
});
