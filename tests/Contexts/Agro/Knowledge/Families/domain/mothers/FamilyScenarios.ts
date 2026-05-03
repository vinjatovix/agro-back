import type { FamilyExtraPrimitives } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/domain/types/FamilyExtraPrimitives.js';
import type { FamilyProps } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/domain/types/FamilyProps.js';
import type { MongoFamilyDocument } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/infrastructure/persistence/types/MongoFamilyDocument.js';

import { Family } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/domain/entities/Family.js';
import { Metadata } from '../../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../../../../../src/Contexts/shared/domain/valueObject/Uuid.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

import { random } from '../../../../../shared/fixtures/random.js';
import { UuidMother } from '../../../../../shared/fixtures/UuidMother.js';

const USER = 'test-user';

const FAMILY_BASE_VALUES = {
  slug: 'asteraceae',
  name: 'Asteraceae',
  aliases: ['Compositae'],
  scientificName: 'Asteraceae',
  shortDescription:
    'The Asteraceae, also known as Compositae, is a large family of flowering plants that includes daisies, sunflowers, and chrysanthemums.',
  highlights: [
    'One of the largest plant families with over 23,000 species.',
    'Characterized by composite flower heads (capitula) that are often mistaken for single flowers.'
  ]
};

const commonExtra = {
  order: 'Asterales',
  distribution: 'Cosmopolitan',
  speciesCount: 32000
};

const buildDomainBase = (): FamilyProps => ({
  id: Uuid.create(UuidMother.random().value),
  ...FAMILY_BASE_VALUES,
  metadata: Metadata.create(USER)
});

const buildRandomPrimitives = (): Omit<FamilyProps, 'id' | 'metadata'> => ({
  slug: random.word(),
  name: random.word(),
  aliases: [random.word(), random.word()],
  scientificName: random.word(),
  shortDescription: random.description(),
  highlights: [random.word(), random.word()]
});

export const FamilyScenarios = {
  domainBase: (): Family => {
    return Family.create(buildDomainBase());
  },

  domainBaseWithExtra: (extra?: FamilyExtraPrimitives): Family => {
    return Family.create({
      ...buildDomainBase(),
      extra: extra ?? commonExtra
    });
  },

  domainRandom: (overrides?: Partial<FamilyProps>): Family => {
    return Family.create({
      id: Uuid.create(UuidMother.random().value),
      metadata: Metadata.create(USER),
      ...buildRandomPrimitives(),
      ...overrides
    });
  },

  mongoBase: (): MongoFamilyDocument => {
    return {
      _id: toMongoId(UuidMother.random().value),
      ...FAMILY_BASE_VALUES,
      metadata: Metadata.create(USER).toPrimitives()
    };
  },

  mongoBaseWithExtra: (extra?: FamilyExtraPrimitives): MongoFamilyDocument => {
    return {
      ...FamilyScenarios.mongoBase(),
      extra: extra ?? commonExtra
    };
  },

  mongoRandom: (
    overrides?: Partial<MongoFamilyDocument>
  ): MongoFamilyDocument => {
    return {
      _id: toMongoId(UuidMother.random().value),
      metadata: Metadata.create(USER).toPrimitives(),
      ...buildRandomPrimitives(),
      ...overrides
    };
  }
};
