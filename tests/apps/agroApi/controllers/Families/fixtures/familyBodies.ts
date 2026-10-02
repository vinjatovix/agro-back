import { random } from '../../../../../Contexts/shared/fixtures/random.js';

type Body = Record<string, unknown>;

/** The smallest valid creation body: no `aliases`, no `extra`. */
export const buildMinimalCreateFamilyBody = (overrides: Body = {}): Body => ({
  id: random.uuid(),
  slug: 'rosaceae',
  name: 'Rosaceae',
  scientificName: 'Rosaceae',
  shortDescription: 'The rose family.',
  highlights: ['Five petals'],
  ...overrides
});

/** A creation body with every optional field. */
export const buildFullCreateFamilyBody = (overrides: Body = {}): Body =>
  buildMinimalCreateFamilyBody({
    aliases: ['Rose family'],
    extra: {
      order: 'Rosales',
      distribution: 'Worldwide',
      speciesCount: 3000,
      subfamilies: ['Rosoideae']
    },
    ...overrides
  });
