import { randomInt } from 'node:crypto';
import { PlantSowing } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.js';
import { random } from '../../../../shared/fixtures/random.js';

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
    ).toThrow('PlantSowing.months must have at least one month');
  });

  it('should throw if direct method is missing', () => {
    const input = {
      ...buildBase(),
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
      ...buildBase(),
      methods: {
        direct: directMethod(),
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
});
