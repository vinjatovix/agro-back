import { familyResponseSchema } from '../../../../../src/apps/agroApi/controllers/Families/responseSchemas.js';
import {
  baseFamilyView,
  fullFamilyView,
  withoutKey,
  withValueAt
} from './fixtures/familyResponses.js';

describe('familyResponseSchema', () => {
  it('accepts a full read view unchanged', () => {
    const view = fullFamilyView();

    expect(familyResponseSchema.parse(view)).toEqual(view);
  });

  it('keeps an absent extra absent', () => {
    const parsed = familyResponseSchema.parse(baseFamilyView());

    expect(parsed).not.toHaveProperty('extra');
  });

  it.each(['internalNote', 'extra.internalNote'])(
    'removes the unknown key %s',
    (path) => {
      const view = fullFamilyView();

      expect(familyResponseSchema.parse(withValueAt(view, path, 'x'))).toEqual(
        view
      );
    }
  );

  it.each(['slug', 'shortDescription', 'aliases', 'highlights'] as const)(
    'rejects a view missing the required field %s',
    (key) => {
      expect(
        familyResponseSchema.safeParse(withoutKey(fullFamilyView(), key))
          .success
      ).toBe(false);
    }
  );

  it.each([
    ['version', -1],
    ['name', 42],
    ['aliases', 'Compositae'],
    ['extra.speciesCount', '3000'],
    ['metadata', 'today']
  ])('rejects a wrong type or value at %s', (path, value) => {
    expect(
      familyResponseSchema.safeParse(withValueAt(fullFamilyView(), path, value))
        .success
    ).toBe(false);
  });

  it('accepts a stored id that is not a UUID', () => {
    const view = withValueAt(baseFamilyView(), 'id', 'fam_test');

    expect(familyResponseSchema.parse(view).id).toBe('fam_test');
  });

  it('sends stored text unchanged: no trimming on output', () => {
    const view = withValueAt(baseFamilyView(), 'name', '  Rosaceae  ');

    expect(familyResponseSchema.parse(view).name).toBe('  Rosaceae  ');
  });
});
