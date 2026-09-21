import { createFamilyId } from '../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import {
  type IdentityDomain,
  type IdentityPrimitives,
  plantIdentityMapper
} from '../../../../../src/Contexts/Agro/Plants/mappers/plantIdentityMapper.js';
import { random } from '../../../shared/fixtures/random.js';

describe('plantIdentityMapper', () => {
  const MOCK_FAMILY_ID = random.uuid();
  const MOCK_FAMILY_ID_2 = random.uuid();

  describe('toPrimitives', () => {
    it('should map IdentityDomain to IdentityPrimitives correctly', () => {
      const identity: IdentityDomain = {
        name: {
          primary: 'Tomato',
          aliases: ['Tomaquet', 'Tomate']
        },
        family: createFamilyId(MOCK_FAMILY_ID),
        scientificName: 'Solanum lycopersicum'
      };

      const result = plantIdentityMapper.toPrimitives(identity);

      expect(result).toEqual({
        name: {
          primary: 'Tomato',
          aliases: ['Tomaquet', 'Tomate']
        },
        family: MOCK_FAMILY_ID,
        scientificName: 'Solanum lycopersicum'
      });
    });

    it('should omit scientificName in primitives when it is undefined in domain', () => {
      const identity: IdentityDomain = {
        name: {
          primary: 'Tomato'
        },
        family: createFamilyId(MOCK_FAMILY_ID)
      };

      const result = plantIdentityMapper.toPrimitives(identity);

      expect(result).toEqual({
        name: {
          primary: 'Tomato'
        },
        family: MOCK_FAMILY_ID
      });
    });
  });

  describe('fromPrimitives', () => {
    it('should map IdentityPrimitives to IdentityDomain correctly', () => {
      const primitives: IdentityPrimitives = {
        name: {
          primary: 'Tomato',
          aliases: ['Tomaquet', 'Tomate']
        },
        family: MOCK_FAMILY_ID,
        scientificName: 'Solanum lycopersicum'
      };

      const result = plantIdentityMapper.fromPrimitives(primitives);

      expect(result).toEqual({
        name: {
          primary: 'Tomato',
          aliases: ['Tomaquet', 'Tomate']
        },
        family: createFamilyId(MOCK_FAMILY_ID),
        scientificName: 'Solanum lycopersicum'
      });
    });

    it('should map without scientificName when it is undefined or null', () => {
      const primitives: IdentityPrimitives = {
        name: {
          primary: 'Tomato'
        },
        family: MOCK_FAMILY_ID,
        scientificName: null
      };

      const result = plantIdentityMapper.fromPrimitives(primitives);

      expect(result).toEqual({
        name: {
          primary: 'Tomato'
        },
        family: createFamilyId(MOCK_FAMILY_ID)
      });
    });
  });

  describe('reversibility and roundtrip', () => {
    it.each([
      [
        'with scientific name',
        {
          name: { primary: 'Lettuce', aliases: ['Aciuga'] },
          family: MOCK_FAMILY_ID_2,
          scientificName: 'Lactuca sativa'
        }
      ],
      [
        'without scientific name',
        {
          name: { primary: 'Lettuce' },
          family: MOCK_FAMILY_ID_2
        }
      ]
    ])('should correctly roundtrip %s', (_, primitives: IdentityPrimitives) => {
      const domain = plantIdentityMapper.fromPrimitives(primitives);
      const result = plantIdentityMapper.toPrimitives(domain);

      expect(result).toEqual(primitives);
    });
  });
});
