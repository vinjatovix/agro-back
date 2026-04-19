import { Plant } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { PlantLifecycle } from '../../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantLifecycicle.js';
import { Metadata } from '../../../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../../../src/shared/domain/value-objects/Range.js';

describe('Plant', () => {
  const createPlant = () =>
    new Plant({
      id: 'tomato',
      name: 'Tomato',
      familyId: 'solanaceae',
      lifecycle: PlantLifecycle.from('annual'),

      size: {
        height: new Range(10, 100),
        spread: new Range(10, 30)
      },

      spacingCm: new Range(10, 20),

      sowingMonths: new MonthSet([3, 4]),
      floweringMonths: new MonthSet([6, 7]),
      harvestMonths: new MonthSet([8, 9]),

      metadata: new Metadata({
        createdAt: new Date(),
        createdBy: 'test',
        updatedAt: new Date(),
        updatedBy: 'test'
      })
    });

  it('should create a valid plant', () => {
    const plant = createPlant();

    expect(plant.id).toBe('tomato');
    expect(plant.name).toBe('Tomato');
    expect(plant.size).toBeDefined();
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

    expect(plant.sowingMonths).toBeDefined();
    expect(plant.floweringMonths).toBeDefined();
    expect(plant.harvestMonths).toBeDefined();
  });

  it('should return primitives correctly', () => {
    const plant = createPlant();

    const result = plant.toPrimitives();

    expect(result.id).toBe('tomato');
    expect(result.name).toBe('Tomato');
    expect(result.lifecycle).toBe('annual');
  });

  it('should preserve value objects integrity', () => {
    const plant = createPlant();

    expect(plant.spacing).toBeInstanceOf(Range);
    expect(plant.size.height).toBeInstanceOf(Range);
  });
});
