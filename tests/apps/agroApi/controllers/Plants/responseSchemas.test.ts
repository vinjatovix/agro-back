import {
  familySummarySchema,
  plantFamilySchema,
  plantFieldsetResponseSchema,
  plantResponseSchema
} from '../../../../../src/apps/agroApi/controllers/Plants/responseSchemas.js';
import { REQUEST_LIMITS } from '../../../../../src/apps/agroApi/shared/requestSchemas.js';
import { fullFamilyView } from '../Families/fixtures/familyResponses.js';
import {
  fullPlantView,
  minimalPlantView,
  plantViewWithImage,
  withoutKeyAt,
  withValueAt
} from './fixtures/plantResponses.js';

describe('plantResponseSchema', () => {
  it('accepts a full read view unchanged', () => {
    const view = fullPlantView();

    expect(plantResponseSchema.parse(view)).toEqual(view);
  });

  it('keeps absent optional fields absent', () => {
    const view = minimalPlantView();

    const parsed = plantResponseSchema.parse(view);

    // Strict: an absent field that came back as an `undefined` key would fail.
    expect(parsed).toStrictEqual(view);
  });

  it('keeps deletedAt null', () => {
    const view = minimalPlantView();

    expect(plantResponseSchema.parse(view).deletedAt).toBeNull();
  });

  it.each([
    'internalNote',
    'traits.internalNote',
    'identity.name.internalNote'
  ])('removes the unknown key %s', (path) => {
    const view = fullPlantView();

    expect(
      plantResponseSchema.parse(withValueAt(view, path, 'secret'))
    ).toEqual(view);
  });

  it.each(['identity', 'traits.lifecycle', 'phenology.sowing', 'metadata'])(
    'rejects a view missing the required field %s',
    (path) => {
      expect(
        plantResponseSchema.safeParse(withoutKeyAt(fullPlantView(), path))
          .success
      ).toBe(false);
    }
  );

  it.each([
    ['version', '1'],
    ['traits.lifecycle', 'forever'],
    ['traits.size.height', { min: '1', max: 2 }],
    ['status', 'ARCHIVED'],
    ['deletedAt', 'yesterday']
  ])('rejects a wrong type or value at %s', (path, value) => {
    expect(
      plantResponseSchema.safeParse(withValueAt(fullPlantView(), path, value))
        .success
    ).toBe(false);
  });

  it('keeps a plain family id that is not a UUID', () => {
    const view = withValueAt(minimalPlantView(), 'identity.family', 'fam_test');

    expect(plantResponseSchema.parse(view).identity.family).toBe('fam_test');
  });

  it('sends stored text unchanged: no trimming on output', () => {
    const view = withValueAt(
      minimalPlantView(),
      'identity.name.primary',
      '  Tomate  '
    );

    expect(plantResponseSchema.parse(view).identity.name.primary).toBe(
      '  Tomate  '
    );
  });

  it('accepts a plant view with the maximum allowed notes', () => {
    const notes = Array.from(
      { length: REQUEST_LIMITS.listItems },
      (_, index) => `Note ${index}`
    );
    const view = withValueAt(fullPlantView(), 'knowledge.notes', notes);

    const parsed = plantResponseSchema.parse(view);

    expect(parsed.knowledge.notes).toHaveLength(REQUEST_LIMITS.listItems);
  });

  it('rejects a plant view exceeding the maximum allowed notes', () => {
    const notes = Array.from(
      { length: REQUEST_LIMITS.listItems + 1 },
      (_, index) => `Note ${index}`
    );
    const view = withValueAt(fullPlantView(), 'knowledge.notes', notes);

    const result = plantResponseSchema.safeParse(view);

    expect(result.success).toBe(false);
  });
});

describe('plant image', () => {
  it('rejects a null image: every plant has one', () => {
    expect(
      plantResponseSchema.safeParse(
        withValueAt(plantViewWithImage(), 'image', null)
      ).success
    ).toBe(false);
  });

  it('rejects a null image in the image fieldset', () => {
    const { id } = plantViewWithImage();

    expect(
      plantFieldsetResponseSchema(['image']).safeParse({ id, image: null })
        .success
    ).toBe(false);
  });
});

describe('plant family relation', () => {
  const family = fullFamilyView();
  const summary = (): { id: string; name: string; slug: string } => {
    const { id, name, slug } = family;

    return { id, name, slug };
  };

  it('accepts and keeps a plain family id', () => {
    const view = withValueAt(minimalPlantView(), 'identity.family', 'fam_test');

    expect(plantResponseSchema.parse(view).identity.family).toBe('fam_test');
  });

  it('accepts a family summary', () => {
    const view = withValueAt(minimalPlantView(), 'identity.family', summary());

    expect(plantResponseSchema.parse(view).identity.family).toEqual(summary());
  });

  it('keeps only id, name and slug of a summary with extra keys', () => {
    const view = withValueAt(minimalPlantView(), 'identity.family', family);

    expect(plantResponseSchema.parse(view).identity.family).toEqual(summary());
  });

  const invalidFamilies: [string, unknown][] = [
    ['a number', 42],
    ['null', null],
    ['an empty string', ''],
    ['an array', ['fam_test']],
    ['a summary missing its slug', { id: 'fam_test', name: 'Rosaceae' }]
  ];

  it.each(invalidFamilies)('rejects %s as a family', (_case, value) => {
    expect(plantFamilySchema.safeParse(value).success).toBe(false);
  });

  it.each(invalidFamilies)(
    'rejects a plant whose family is %s',
    (_case, value) => {
      const view = withValueAt(minimalPlantView(), 'identity.family', value);

      expect(plantResponseSchema.safeParse(view).success).toBe(false);
    }
  );

  describe('familySummarySchema', () => {
    it('strips every key but id, name and slug', () => {
      expect(familySummarySchema.parse(family)).toEqual(summary());
    });

    it('rejects a blank name', () => {
      expect(
        familySummarySchema.safeParse({ ...summary(), name: '   ' }).success
      ).toBe(false);
    });
  });
});

describe('plantFieldsetResponseSchema', () => {
  it('is the full schema without a fieldset', () => {
    expect(plantFieldsetResponseSchema()).toBe(plantResponseSchema);
  });

  it('keeps id and the requested fields with their contract shape', () => {
    const view = fullPlantView();

    expect(
      plantFieldsetResponseSchema(['identity', 'traits']).parse(view)
    ).toEqual({ id: view.id, identity: view.identity, traits: view.traits });
  });

  it('keeps only id for an empty fieldset', () => {
    const view = fullPlantView();

    expect(plantFieldsetResponseSchema([]).parse(view)).toEqual({
      id: view.id
    });
  });

  it('accepts a sparse view holding only the requested fields', () => {
    const { id, traits } = fullPlantView();

    expect(
      plantFieldsetResponseSchema(['traits']).safeParse({ id, traits }).success
    ).toBe(true);
  });

  it('rejects a requested field that breaks the contract', () => {
    const view = withValueAt(fullPlantView(), 'traits.lifecycle', 'forever');

    expect(
      plantFieldsetResponseSchema(['traits']).safeParse(view).success
    ).toBe(false);
  });

  it('ignores a broken field that was not requested', () => {
    const view = withValueAt(fullPlantView(), 'traits.lifecycle', 'forever');

    expect(
      plantFieldsetResponseSchema(['identity']).safeParse(view).success
    ).toBe(true);
  });
});
