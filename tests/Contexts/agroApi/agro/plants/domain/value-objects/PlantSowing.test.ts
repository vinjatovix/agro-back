import { randomInt } from 'node:crypto';
import { PlantSowing } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantSowing.js';
import { random } from '../../../../../shared/fixtures/random.js';

describe('PlantSowing (value object)', () => {
  it('should throw if months is empty', () => {
    expect(() =>
      PlantSowing.fromPrimitives({
        months: [],
        seedsPerHole: {
          min: random.integer({
            min: 1,
            max: 10
          }),
          max: random.integer({
            min: 11,
            max: 20
          })
        },
        germinationDays: {
          min: random.integer({ min: 1, max: 5 }),
          max: random.integer({ min: 6, max: 15 })
        },
        methods: {
          direct: {
            depthCm: {
              min: random.integer({ min: 1, max: 5 }),
              max: random.integer({ min: 6, max: 10 })
            }
          }
        }
      })
    ).toThrow('PlantSowing.months must have at least one month');
  });

  it('should throw if direct method is missing', () => {
    const input = {
      months: [3],
      seedsPerHole: { min: 1, max: 2 },
      germinationDays: { min: 1, max: 2 },
      methods: {
        direct: undefined
      }
    } as unknown as Parameters<typeof PlantSowing.fromPrimitives>[0];

    expect(() => PlantSowing.fromPrimitives(input)).toThrow(
      'PlantSowing.direct.depthCm is required'
    );
  });

  it('should throw if starter exists but depth is missing', () => {
    const input = {
      months: [3],
      seedsPerHole: { min: 1, max: 2 },
      germinationDays: { min: 1, max: 2 },
      methods: {
        direct: {
          depthCm: { min: 1, max: 2 }
        },
        starter: {} // inválido
      }
    } as unknown as Parameters<typeof PlantSowing.fromPrimitives>[0];

    expect(() => PlantSowing.fromPrimitives(input)).toThrow(
      'PlantSowing.starter.depthCm is required'
    );
  });

  it('should build correctly from valid primitives', () => {
    const sowingMonths = [randomInt(7, 12), randomInt(1, 6)];
    const sowing = PlantSowing.fromPrimitives({
      months: sowingMonths,
      seedsPerHole: {
        min: random.integer({ min: 1, max: 5 }),
        max: random.integer({ min: 6, max: 10 })
      },
      germinationDays: {
        min: random.integer({ min: 1, max: 5 }),
        max: random.integer({ min: 6, max: 15 })
      },
      methods: {
        direct: {
          depthCm: {
            min: random.integer({ min: 1, max: 5 }),
            max: random.integer({ min: 6, max: 10 })
          }
        }
      }
    });

    const expectedMonths = [...sowingMonths].sort((a, b) => a - b);

    expect(sowing.months.toArray()).toEqual(expectedMonths);
  });

  it('should preserve optional starter method', () => {
    const sowing = PlantSowing.fromPrimitives({
      months: [randomInt(1, 13)],
      seedsPerHole: {
        min: random.integer({ min: 1, max: 5 }),
        max: random.integer({ min: 6, max: 10 })
      },
      germinationDays: {
        min: random.integer({ min: 1, max: 5 }),
        max: random.integer({ min: 6, max: 15 })
      },
      methods: {
        direct: {
          depthCm: {
            min: random.integer({ min: 1, max: 5 }),
            max: random.integer({ min: 6, max: 10 })
          }
        },
        starter: {
          depthCm: {
            min: random.integer({ min: 2, max: 3 }),
            max: random.integer({ min: 4, max: 5 })
          }
        }
      }
    });

    expect(sowing.methods.starter).toBeDefined();
  });
});
