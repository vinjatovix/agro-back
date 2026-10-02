import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import type { IdentityPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/IdentityPrimitives.js';
import { PlantIdentity } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantIdentity.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantIdentityBuilder } from '../mothers/PlantIdentityBuilder.js';

/** The tomato identity, with `name` fields and top-level fields replaced. */
const tomato = (
  overrides: Partial<Omit<IdentityPrimitives, 'name'>> = {},
  name: Partial<IdentityPrimitives['name']> = {}
): IdentityPrimitives => {
  const base = PlantIdentityBuilder.tomato().toPrimitives();
  return { ...base, ...overrides, name: { ...base.name, ...name } };
};

describe('PlantIdentity', () => {
  describe('constructor', () => {
    it.each([
      ['name.primary', tomato({}, { primary: '   ' })],
      ['scientificName', tomato({ scientificName: '   ' })],
      ['family', tomato({ family: '   ' })]
    ])('should reject a blank %s', (field, primitives) => {
      const build = (): PlantIdentity => new PlantIdentity(primitives);

      expect(build).toThrow(InvalidArgumentException);
      expect(build).toThrow(field);
    });

    it('should reject a family that is not a valid id', () => {
      const primitives = tomato({ family: 'not-a-uuid' });

      expect(() => new PlantIdentity(primitives)).toThrow(
        InvalidArgumentException
      );
    });

    it('should trim its texts and family', () => {
      const family = randomFamilyId();
      const primitives = tomato(
        { scientificName: '  Solanum lycopersicum  ', family: `  ${family}  ` },
        { primary: '  Tomato  ' }
      );

      const identity = new PlantIdentity(primitives);

      expect(identity.name.primary).toBe('Tomato');
      expect(identity.scientificName).toBe('Solanum lycopersicum');
      expect(identity.family).toBe(family);
    });

    it('should trim aliases and drop empty ones', () => {
      const primitives = tomato(
        {},
        { aliases: [' tomatera ', '  ', 'cherry'] }
      );

      expect(new PlantIdentity(primitives).name.aliases).toEqual([
        'tomatera',
        'cherry'
      ]);
    });
  });

  describe('update', () => {
    it('should keep the fields the changes leave out', () => {
      const identity = PlantIdentityBuilder.withAliases();

      const updated = identity.update({ scientificName: 'Solanum' });

      expect(updated.name).toEqual(identity.name);
      expect(updated.family).toBe(identity.family);
      expect(updated.scientificName).toBe('Solanum');
    });

    it('should remove the aliases on null', () => {
      const identity = PlantIdentityBuilder.withAliases();

      const updated = identity.update({ name: { aliases: null } });

      expect(updated.name).not.toHaveProperty('aliases');
    });

    it('should reject a blank scientificName', () => {
      const identity = PlantIdentityBuilder.tomato();

      expect(() => identity.update({ scientificName: ' ' })).toThrow(
        /scientificName/
      );
    });
  });

  describe('primitives', () => {
    it.each([
      ['with aliases', PlantIdentityBuilder.withAliases()],
      ['without aliases', PlantIdentityBuilder.tomato()]
    ])('should round-trip an identity %s', (_, identity) => {
      const primitives = identity.toPrimitives();

      expect(PlantIdentity.fromPrimitives(primitives).toPrimitives()).toEqual(
        primitives
      );
    });

    it('should leave out aliases it does not have', () => {
      expect(
        PlantIdentityBuilder.tomato().toPrimitives().name
      ).not.toHaveProperty('aliases');
    });
  });
});
