import type { PlantProps } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantProps.js';
import { random } from '../../../../../shared/fixtures/random.js';

export const PlantIdentityBuilder = {
  generic(): PlantProps['identity'] {
    return {
      name: { primary: 'Generic plant' },
      familyId: 'generic'
    };
  },

  random(): PlantProps['identity'] {
    return {
      name: { primary: random.word({ min: 3, max: 10 }) },
      familyId: random.word({ min: 5, max: 12 })
    };
  },

  tomato(): PlantProps['identity'] {
    return {
      name: { primary: 'Tomato' },
      familyId: 'solanaceae'
    };
  },

  lettuce(): PlantProps['identity'] {
    return {
      name: { primary: 'Lettuce' },
      familyId: 'asteraceae'
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
      familyId: 'generic'
    };
  }
};
