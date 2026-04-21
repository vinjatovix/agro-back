import { Plant } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { type PlantProps } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantProps.js';
import {
  PlantLifecycle,
  PlantSowing
} from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/index.js';
import {
  Metadata,
  Uuid
} from '../../../../../../../../src/Contexts/shared/domain/valueObject/index.js';
import {
  MonthSet,
  Range
} from '../../../../../../../../src/shared/domain/value-objects/index.js';
import { UuidMother } from '../../../../../../shared/fixtures/UuidMother.js';

describe('Plant', () => {
  const createPlant = (overrides: Partial<PlantProps> = {}) =>
    new Plant({
      id: UuidMother.random(),
      name: 'Tomato',
      familyId: 'solanaceae',
      lifecycle: PlantLifecycle.from('annual'),

      size: {
        height: new Range(10, 100),
        spread: new Range(10, 30)
      },

      spacingCm: new Range(10, 20),

      sowing: new PlantSowing({
        seedsPerHole: new Range(1, 3),
        germinationDays: new Range(7, 14),
        months: new MonthSet([3]),
        methods: {
          direct: { depth: new Range(1, 2) }
        }
      }),

      floweringMonths: new MonthSet([6, 7]),
      harvestMonths: new MonthSet([8, 9]),

      metadata: Metadata.create('test'),

      ...overrides
    });

  it('should create a valid plant', () => {
    const plant = createPlant();

    expect(plant.id).toBeInstanceOf(Uuid);
    expect(plant.name).toBe('Tomato');
    expect(plant.size).toBeDefined();
  });

  it('should include scientificName when provided', () => {
    const plant = createPlant({
      scientificName: 'Solanum lycopersicum'
    });

    const result = plant.toPrimitives();

    expect(result.scientificName).toBe('Solanum lycopersicum');
  });

  it('should not include scientificName when not provided', () => {
    const plant = createPlant();

    const result = plant.toPrimitives();

    expect(result.scientificName).toBeUndefined();
  });

  it('should expose size correctly', () => {
    const plant = createPlant();

    expect(plant.size.height.min).toBe(10);
    expect(plant.size.height.max).toBe(100);
    expect(plant.size.spread.max).toBe(30);
  });

  it('should expose spacing correctly', () => {
    const plant = createPlant();

    expect(plant.spacing.min).toBe(10);
    expect(plant.spacing.max).toBe(20);
  });

  it('should expose growth months', () => {
    const plant = createPlant();

    expect(plant.sowing).toBeDefined();
    expect(plant.floweringMonths).toBeDefined();
    expect(plant.harvestMonths).toBeDefined();
  });

  it('should correctly serialize sowing', () => {
    const plant = createPlant();

    const result = plant.toPrimitives();

    expect(typeof result.sowing.methods.direct.depthCm.min).toBe('number');
  });

  it('should return primitives correctly', () => {
    const plant = createPlant();

    const result = plant.toPrimitives();

    expect(typeof result.id).toBe('string');
    expect(result.id).toBe(plant.id.value);
    expect(result.name).toBe('Tomato');
    expect(result.lifecycle).toBe('annual');
  });

  it('should include metadata in primitives', () => {
    const plant = createPlant();

    const result = plant.toPrimitives();

    expect(result.metadata).toBeDefined();
    expect(result.metadata.createdAt).toBeInstanceOf(Date);
    expect(result.metadata.createdBy).toBe('test');
    expect(result.metadata.updatedAt).toBeInstanceOf(Date);
    expect(result.metadata.updatedBy).toBe('test');
  });

  it('should preserve value objects integrity', () => {
    const plant = createPlant();

    expect(plant.spacing).toBeInstanceOf(Range);
    expect(plant.size.height).toBeInstanceOf(Range);
  });
});
