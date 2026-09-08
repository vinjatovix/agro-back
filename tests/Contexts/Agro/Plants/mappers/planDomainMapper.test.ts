import { plantDomainMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { PlantFactory } from '../domain/mothers/PlantFactory.js';

describe('PlantDomainMapper', () => {
  it('should map plant to primitives correctly (base)', () => {
    const plant = PlantFactory.tomato();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.id).toBe(plant.id.value);
    expect(p.identity.name.primary).toBe(plant.identity.name.primary);
    expect(p.traits.lifecycle).toBe(plant.traits.lifecycle.getValue());
  });

  it('should preserve nested structures (phenology + sowing)', () => {
    const plant = PlantFactory.tomato();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.traits.size.height).toEqual(
      plant.traits.size.height.toPrimitives()
    );

    expect(p.traits.spacingCm).toEqual(plant.traits.spacingCm.toPrimitives());

    expect(p.phenology.sowing.seedsPerHole).toEqual(
      plant.phenology.sowing.seedsPerHole
    );

    expect(p.phenology.sowing.germinationDays).toEqual(
      plant.phenology.sowing.germinationDays
    );

    expect(p.phenology.sowing.methods.direct.depthCm).toEqual(
      plant.phenology.sowing.methods.direct.depthCm
    );
  });

  it('should include pollination when present', () => {
    const plant = PlantFactory.full();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.phenology.flowering.pollination).toBeDefined();
    expect(p.phenology.flowering.pollination?.type).toBe(
      plant.phenology.flowering.pollination?.type
    );
  });

  it('should omit pollination when not present', () => {
    const plant = PlantFactory.create();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.phenology.flowering.pollination).toBeUndefined();
  });

  it('should include harvest description when present', () => {
    const plant = PlantFactory.full();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.phenology.harvest.description).toBe(
      plant.phenology.harvest.description
    );
  });

  it('should handle knowledge empty fallback', () => {
    const plant = PlantFactory.create();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.knowledge).toBeDefined();
  });

  it('should preserve deletedAt when present', () => {
    const plant = PlantFactory.tomato();
    plant.deletedAt = new Date();

    const p = plantDomainMapper.toPrimitives(plant);

    expect(p.deletedAt).toBeDefined();
  });

  it('should be reversible (full structure)', () => {
    const plant = PlantFactory.full();

    const primitives = plantDomainMapper.toPrimitives(plant);
    const restored = plantDomainMapper.fromPrimitives(primitives);
    const restoredP = plantDomainMapper.toPrimitives(restored);

    expect(restoredP).toMatchObject(primitives);
  });
});
