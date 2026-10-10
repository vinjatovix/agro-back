import type { PlantResourcePrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/index.js';
import { random } from '../../../../shared/fixtures/random.js';

export type PlantResource = PlantResourcePrimitives;

const resource = (
  type: PlantResource['type'],
  overrides: Partial<PlantResource>
): PlantResource => ({
  type,
  url: random.url(),
  title: random.description(),
  source: random.word({ min: 3, max: 12 }),
  ...overrides
});

export const PlantResourceBuilder = {
  image(overrides: Partial<PlantResource> = {}): PlantResource {
    return resource('image', overrides);
  },

  /** An image with only `type` and `url`. */
  bareImage(): PlantResource {
    return { type: 'image', url: random.url() };
  },

  video(overrides: Partial<PlantResource> = {}): PlantResource {
    return resource('video', overrides);
  },

  article(overrides: Partial<PlantResource> = {}): PlantResource {
    return resource('article', overrides);
  }
};
