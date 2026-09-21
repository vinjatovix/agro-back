import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { random } from '../../../../shared/fixtures/random.js';

export const GENERIC_FAMILY_ID = randomFamilyId();
export const SOLANACEAE_FAMILY_ID = randomFamilyId();
export const ASTERACEAE_FAMILY_ID = randomFamilyId();

export const PlantIdentityBuilder = {
  generic(): PlantProps['identity'] {
    return {
      name: { primary: 'Generic plant' },
      family: GENERIC_FAMILY_ID
    };
  },

  random(): PlantProps['identity'] {
    return {
      name: { primary: random.word({ min: 3, max: 10 }) },
      family: randomFamilyId()
    };
  },

  tomato(): PlantProps['identity'] {
    return {
      name: { primary: 'Tomato' },
      family: SOLANACEAE_FAMILY_ID
    };
  },

  lettuce(): PlantProps['identity'] {
    return {
      name: { primary: 'Lettuce' },
      family: ASTERACEAE_FAMILY_ID
    };
  },

  withScientificName(
    scientificName = random.word({ min: 5, max: 15 })
  ): PlantProps['identity'] {
    return {
      name: {
        primary: 'Plant with scientific name'
      },
      scientificName,
      family: GENERIC_FAMILY_ID
    };
  }
};
