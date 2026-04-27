import type { RootSystemPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/RootSystemPrimitives.js';
import { RootSystem } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/RootSystem.js';

describe('RootSystem', () => {
  const primitives: RootSystemPrimitives = {
    type: 'taproot',
    depthCm: { min: 30, max: 120 },
    spreadCm: { min: 20, max: 80 }
  };

  it('should create from primitives correctly', () => {
    const root = RootSystem.fromPrimitives(primitives);

    expect(root.type).toBe('taproot');
    expect(root.depthCm.toPrimitives()).toEqual(primitives.depthCm);
    expect(root.spreadCm.toPrimitives()).toEqual(primitives.spreadCm);
  });

  it('should convert to primitives correctly', () => {
    const root = RootSystem.fromPrimitives(primitives);

    expect(root.toPrimitives()).toEqual(primitives);
  });

  it('should preserve type correctly', () => {
    const root = RootSystem.fromPrimitives(primitives);

    expect(root.type).toMatch(/fibrous|taproot|adventitious|rhizome/);
  });

  it('should support custom root system types', () => {
    const custom: RootSystemPrimitives = {
      type: 'mycorrhizal',
      depthCm: { min: 10, max: 50 },
      spreadCm: { min: 15, max: 60 }
    };

    const root = RootSystem.fromPrimitives(custom);

    expect(root.type).toBe('mycorrhizal');
    expect(root.toPrimitives()).toEqual(custom);
  });

  it('should preserve domain structure integrity', () => {
    const root = RootSystem.fromPrimitives(primitives);

    expect(root.depthCm).toBeDefined();
    expect(root.spreadCm).toBeDefined();

    expect(typeof root.depthCm.toPrimitives).toBe('function');
    expect(typeof root.spreadCm.toPrimitives).toBe('function');
  });
});
