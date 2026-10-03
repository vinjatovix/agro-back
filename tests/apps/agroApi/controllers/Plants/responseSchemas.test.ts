import {
  familySummarySchema,
  plantFamilySchema,
  plantResponseSchema
} from '../../../../../src/apps/agroApi/controllers/Plants/responseSchemas.js';
import { fullFamilyView } from '../Families/fixtures/familyResponses.js';
import {
  fullPlantView,
  minimalPlantView,
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
