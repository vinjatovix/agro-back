import { PlantHarvest } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantHarvest.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantPhenologyBuilder } from '../mothers/PlantPhenologyBuilder.js';

describe('PlantHarvest (value object)', () => {
  it('should round-trip through its primitives', () => {
    const primitives = PlantPhenologyBuilder.full().harvest.toPrimitives();

    const restored = PlantHarvest.fromPrimitives(primitives).toPrimitives();

    expect(restored).toEqual(primitives);
  });

  it('should leave out an absent description', () => {
    expect(PlantHarvest.never().toPrimitives()).toEqual({ months: [] });
  });

  it.each([[''], ['   ']])(
    'should reject the blank description %j',
    (description) => {
      expect(() =>
        PlantHarvest.fromPrimitives({ months: [8], description })
      ).toThrow(InvalidArgumentException);
    }
  );

  it('should keep the description when only the months change', () => {
    const harvest = PlantHarvest.fromPrimitives({
      months: [8],
      description: 'Pick when red'
    });

    const updated = harvest.update({ months: [9] });

    expect(updated.toPrimitives()).toEqual({
      months: [9],
      description: 'Pick when red'
    });
  });
});
