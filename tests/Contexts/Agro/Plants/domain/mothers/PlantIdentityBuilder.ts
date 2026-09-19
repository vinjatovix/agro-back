import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { random } from '../../../../shared/fixtures/random.js';

export const PlantIdentityBuilder = {
  generic(): PlantProps['identity'] {
    return {
      name: { primary: 'Generic plant' },
      family: 'generic'
    };
  },

  random(): PlantProps['identity'] {
    return {
      name: { primary: random.word({ min: 3, max: 10 }) },
      family: random.word({ min: 5, max: 12 })
    };
  },

  tomato(): PlantProps['identity'] {
    return {
      name: { primary: 'Tomato' },
      family: 'solanaceae'
    };
  },

  lettuce(): PlantProps['identity'] {
    return {
      name: { primary: 'Lettuce' },
      family: 'asteraceae'
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
      family: 'generic'
    };
  }
};
