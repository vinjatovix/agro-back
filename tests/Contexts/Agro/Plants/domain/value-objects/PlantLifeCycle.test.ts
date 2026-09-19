import { PlantLifecycle } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantLifecycle.js';

describe('PlantLifecycle', () => {
  it('should create a PlantLifecycle from a valid value', () => {
    const lifecycle = PlantLifecycle.from('annual');

    expect(lifecycle.getValue()).toBe('annual');
  });

  it('should preserve the value for all valid types', () => {
    const annual = PlantLifecycle.from('annual');
    const biennial = PlantLifecycle.from('biennial');
    const perennial = PlantLifecycle.from('perennial');

    expect(annual.getValue()).toBe('annual');
    expect(biennial.getValue()).toBe('biennial');
    expect(perennial.getValue()).toBe('perennial');
  });

  it('should consider two instances with same value as equal', () => {
    const a = PlantLifecycle.from('annual');
    const b = PlantLifecycle.from('annual');

    expect(a.equals(b)).toBe(true);
  });

  it('should consider two instances with different value as not equal', () => {
    const a = PlantLifecycle.from('annual');
    const b = PlantLifecycle.from('perennial');

    expect(a.equals(b)).toBe(false);
  });
});
