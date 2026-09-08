import { randomInt } from 'node:crypto';
import { PlantSowing } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.js';
import {
  MonthSet,
  Range
} from '../../../../../../src/shared/domain/value-objects/index.js';
import type { SowingMethod } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/interfaces/SowingMethod.js';
import { random } from '../../../../shared/fixtures/random.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

describe('PlantSowing (value object)', () => {
  const randomRange = (
    minRange: [number, number],
    maxRange: [number, number]
  ) => ({
    min: random.integer({ min: minRange[0], max: minRange[1] }),
    max: random.integer({ min: maxRange[0], max: maxRange[1] })
  });

  const buildBase = () => ({
    months: [randomInt(1, 13)],
    seedsPerHole: randomRange([1, 5], [6, 10]),
    germinationDays: randomRange([1, 5], [6, 15])
  });

  const directMethod = () => ({
    depthCm: randomRange([1, 5], [6, 10])
  });

  const starterMethod = () => ({
    depthCm: randomRange([2, 3], [4, 5])
  });

  it('should throw if months is empty', () => {
    expect(() =>
      PlantSowing.fromPrimitives({
        ...buildBase(),
        months: [],
        methods: {
          direct: directMethod()
        }
      })
    ).toThrow(InvalidArgumentException);
  });

  it('should throw if direct method is missing', () => {
    const input = {
      ...buildBase(),
      methods: {
        direct: undefined
      }
    } as unknown as Parameters<typeof PlantSowing.fromPrimitives>[0];

    expect(() => PlantSowing.fromPrimitives(input)).toThrow(
      InvalidArgumentException
    );

    // Test direct constructor validation
    expect(
      () =>
        new PlantSowing({
          months: null as unknown as MonthSet,
          seedsPerHole: null as unknown as Range,
          germinationDays: null as unknown as Range,
          methods: { direct: null as unknown as SowingMethod }
        })
    ).toThrow('PlantSowing.direct.depthCm is required');
  });

  it('should throw if starter exists but depth is missing', () => {
    const input = {
      ...buildBase(),
      methods: {
        direct: directMethod(),
        starter: {} // inválido
      }
    } as unknown as Parameters<typeof PlantSowing.fromPrimitives>[0];

    expect(() => PlantSowing.fromPrimitives(input)).toThrow(
      InvalidArgumentException
    );

    // Test direct constructor validation
    expect(
      () =>
        new PlantSowing({
          months: null as unknown as MonthSet,
          seedsPerHole: null as unknown as Range,
          germinationDays: null as unknown as Range,
          methods: {
            direct: { depthCm: true as unknown as Range },
            starter: {} as unknown as SowingMethod
          }
        })
    ).toThrow('PlantSowing.starter.depthCm is required');
  });

  it('should build correctly from valid primitives', () => {
    const sowingMonths = [randomInt(7, 12), randomInt(1, 6)];

    const sowing = PlantSowing.fromPrimitives({
      ...buildBase(),
      months: sowingMonths,
      methods: {
        direct: directMethod()
      }
    });

    const expectedMonths = [...sowingMonths].sort((a, b) => a - b);

    expect(sowing.months.toArray()).toEqual(expectedMonths);
  });

  it('should preserve optional starter method', () => {
    const sowing = PlantSowing.fromPrimitives({
      ...buildBase(),
      methods: {
        direct: directMethod(),
        starter: starterMethod()
      }
    });

    expect(sowing.methods.starter).toBeDefined();
  });

  it('should throw if seedsPerHole min or max is <= 0', () => {
    expect(() =>
      PlantSowing.fromPrimitives({
        ...buildBase(),
        seedsPerHole: { min: 0, max: 0 },
        methods: { direct: directMethod() }
      })
    ).toThrow(InvalidArgumentException);
  });

  it('should throw if germinationDays min or max is <= 0', () => {
    expect(() =>
      PlantSowing.fromPrimitives({
        ...buildBase(),
        germinationDays: { min: 0, max: 0 },
        methods: { direct: directMethod() }
      })
    ).toThrow(InvalidArgumentException);
  });
});
