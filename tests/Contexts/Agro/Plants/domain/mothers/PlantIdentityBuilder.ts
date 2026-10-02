import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import { PlantIdentity } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantIdentity.js';
import { random } from '../../../../shared/fixtures/random.js';

export const GENERIC_FAMILY_ID = randomFamilyId();
export const SOLANACEAE_FAMILY_ID = randomFamilyId();
export const ASTERACEAE_FAMILY_ID = randomFamilyId();

export const PlantIdentityBuilder = {
  generic(): PlantIdentity {
    return new PlantIdentity({
      name: { primary: 'Generic plant' },
      scientificName: 'Plantus genericus',
      family: GENERIC_FAMILY_ID
    });
  },

  random(): PlantIdentity {
    return new PlantIdentity({
      name: { primary: random.word({ min: 3, max: 10 }) },
      scientificName: random.word({ min: 5, max: 15 }),
      family: randomFamilyId()
    });
  },

  tomato(): PlantIdentity {
    return new PlantIdentity({
      name: { primary: 'Tomato' },
      scientificName: 'Solanum lycopersicum',
      family: SOLANACEAE_FAMILY_ID
    });
  },

  lettuce(): PlantIdentity {
    return new PlantIdentity({
      name: { primary: 'Lettuce' },
      scientificName: 'Lactuca sativa',
      family: ASTERACEAE_FAMILY_ID
    });
  },

  named(primary: string, scientificName: string): PlantIdentity {
    return new PlantIdentity({
      name: { primary },
      scientificName,
      family: GENERIC_FAMILY_ID
    });
  },

  withScientificName(
    scientificName = random.word({ min: 5, max: 15 })
  ): PlantIdentity {
    return new PlantIdentity({
      name: {
        primary: 'Plant with scientific name'
      },
      scientificName,
      family: GENERIC_FAMILY_ID
    });
  },

  withAliases(aliases = [random.word({ min: 3, max: 10 })]): PlantIdentity {
    return new PlantIdentity({
      name: {
        primary: 'Plant with aliases',
        aliases
      },
      scientificName: random.word({ min: 5, max: 15 }),
      family: GENERIC_FAMILY_ID
    });
  }
};
