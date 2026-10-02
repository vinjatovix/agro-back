import { PlantPhenology } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantPhenology.js';
import { PlantPhenologyBuilder } from '../mothers/PlantPhenologyBuilder.js';

describe('PlantPhenology (value object)', () => {
  it('should round-trip through its primitives', () => {
    const primitives = PlantPhenologyBuilder.full().toPrimitives();

    const restored = PlantPhenology.fromPrimitives(primitives).toPrimitives();

    expect(restored).toEqual(primitives);
  });

  it('should keep the sections the changes do not touch', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const updated = phenology.update({ harvest: { months: [10] } });

    expect(updated.sowing).toBe(phenology.sowing);
    expect(updated.flowering).toBe(phenology.flowering);
    expect(updated.harvest.months.toArray()).toEqual([10]);
  });

  it('should not modify itself', () => {
    const phenology = PlantPhenologyBuilder.tomato();
    const before = phenology.toPrimitives();

    phenology.update({ flowering: { months: [1] } });

    expect(phenology.toPrimitives()).toEqual(before);
  });
});
