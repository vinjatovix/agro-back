import {
  familyFieldsetResponseSchema,
  familyResponseSchema
} from '../../../../../src/apps/agroApi/controllers/Families/responseSchemas.js';
import { REQUEST_LIMITS } from '../../../../../src/apps/agroApi/shared/requestSchemas.js';
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

  it('accepts a distribution written as long text', () => {
    const distribution = 'x'.repeat(REQUEST_LIMITS.longText);
    const view = withValueAt(
      fullFamilyView(),
      'extra.distribution',
      distribution
    );

    expect(familyResponseSchema.parse(view).extra?.distribution).toBe(
      distribution
    );
  });

  it('rejects a distribution over the long-text limit', () => {
    const view = withValueAt(
      fullFamilyView(),
      'extra.distribution',
      'x'.repeat(REQUEST_LIMITS.longText + 1)
    );

    expect(familyResponseSchema.safeParse(view).success).toBe(false);
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

describe('familyFieldsetResponseSchema', () => {
  it('is the full schema without a fieldset', () => {
    expect(familyFieldsetResponseSchema()).toBe(familyResponseSchema);
  });

  it('keeps id and the requested fields only', () => {
    const view = fullFamilyView();

    expect(familyFieldsetResponseSchema(['name', 'slug']).parse(view)).toEqual({
      id: view.id,
      name: view.name,
      slug: view.slug
    });
  });

  it('keeps a requested extra absent when the family has none', () => {
    const parsed = familyFieldsetResponseSchema(['extra']).parse(
      baseFamilyView()
    );

    expect(parsed).not.toHaveProperty('extra');
  });

  it('rejects a requested field that breaks the contract', () => {
    const view = withValueAt(fullFamilyView(), 'name', '   ');

    expect(familyFieldsetResponseSchema(['name']).safeParse(view).success).toBe(
      false
    );
  });
});
