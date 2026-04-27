import type { SoilProfilePrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/SoilProfilePrimitives.js';
import { SoilProfile } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/SoilProfile.js';

describe('SoilProfile', () => {
  const primitives: SoilProfilePrimitives = {
    ph: { min: 5.5, max: 7.5 },
    availableDepthCm: { min: 20, max: 60 }
  };

  it('should create from primitives correctly', () => {
    const soil = SoilProfile.fromPrimitives(primitives);

    expect(soil.ph.toPrimitives()).toEqual(primitives.ph);
    expect(soil.availableDepthCm.toPrimitives()).toEqual(
      primitives.availableDepthCm
    );
  });

  it('should expose ph and availableDepthCm as Range objects', () => {
    const soil = SoilProfile.fromPrimitives(primitives);

    expect(soil.ph).toBeDefined();
    expect(soil.availableDepthCm).toBeDefined();

    expect(soil.ph.toPrimitives()).toEqual({ min: 5.5, max: 7.5 });
    expect(soil.availableDepthCm.toPrimitives()).toEqual({ min: 20, max: 60 });
  });

  it('should convert to primitives correctly', () => {
    const soil = SoilProfile.fromPrimitives(primitives);

    expect(soil.toPrimitives()).toEqual(primitives);
  });

  it('should preserve immutability of internal structure', () => {
    const soil = SoilProfile.fromPrimitives(primitives);

    const result = soil.toPrimitives();

    expect(result).toEqual(primitives);

    // optional: ensure it's not accidentally mutated reference
    expect(result).not.toBe(primitives);
  });
});
