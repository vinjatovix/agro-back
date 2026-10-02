import { PollinationType } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { PlantFlowering } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantFlowering.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantPhenologyBuilder } from '../mothers/PlantPhenologyBuilder.js';

describe('PlantFlowering (value object)', () => {
  it('should round-trip through its primitives', () => {
    const primitives = PlantPhenologyBuilder.full().flowering.toPrimitives();

    const restored = PlantFlowering.fromPrimitives(primitives).toPrimitives();

    expect(restored).toEqual(primitives);
  });

  it('should leave out an absent pollination', () => {
    expect(PlantFlowering.never().toPrimitives()).toEqual({ months: [] });
  });

  it('should require types to start a pollination', () => {
    expect(() =>
      PlantFlowering.never().update({ pollination: { agents: ['bee'] } })
    ).toThrow(InvalidArgumentException);
  });

  it('should start a pollination with its types and agents', () => {
    const flowering = PlantFlowering.never().update({
      pollination: { types: [PollinationType.BAT], agents: ['fruit bat'] }
    });

    expect(flowering.pollination?.toPrimitives()).toEqual({
      types: [PollinationType.BAT],
      agents: ['fruit bat']
    });
  });

  it('should keep a pollination without flowering months', () => {
    // Bamboos flower once every few decades, with no yearly months.
    const flowering = PlantFlowering.never().update({
      pollination: { types: [PollinationType.WIND] }
    });

    expect(flowering.toPrimitives()).toEqual({
      months: [],
      pollination: { types: [PollinationType.WIND] }
    });
  });

  it('should merge into the stored pollination', () => {
    const flowering = PlantPhenologyBuilder.tomato().flowering;

    const updated = flowering.update({
      pollination: { agents: ['bumblebees'] }
    });

    expect(updated.pollination?.toPrimitives()).toEqual({
      types: flowering.pollination?.types,
      agents: ['bumblebees']
    });
  });
});
