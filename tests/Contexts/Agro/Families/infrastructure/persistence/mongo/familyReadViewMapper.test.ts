import {
  FAMILY_FIELDS,
  type FamilyField
} from '../../../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import {
  toFamilyReadView,
  toFamilySparseView,
  type StoredFamilyDocument
} from '../../../../../../../src/Contexts/Agro/Families/infrastructure/persistence/familyReadViewMapper.js';
import type { MongoFamilyDocument } from '../../../../../../../src/Contexts/Agro/Families/infrastructure/persistence/types/MongoFamilyDocument.js';
import { familyDomainMapper } from '../../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { familyPersistenceMapper } from '../../../../../../../src/Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { fromMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { FamilyScenarios } from '../../../domain/mothers/FamilyScenarios.js';

// The body sent before the read bypass: the stored document round-tripped
// through the aggregate. The read view must equal it for every document.
const domainRoundTrip = (document: MongoFamilyDocument): unknown =>
  familyDomainMapper.toPrimitives(
    familyPersistenceMapper.fromMongoDocument(document)
  );

// A stored `extra` as legacy or hand-edited data may hold it.
const withStoredExtra = (
  extra: Record<string, unknown>
): MongoFamilyDocument => ({ ...FamilyScenarios.mongoBase(), extra });

describe('toFamilyReadView', () => {
  it.each([
    ['a base family', () => FamilyScenarios.mongoBase()],
    ['a family with extra', () => FamilyScenarios.mongoBaseWithExtra()],
    [
      'a family with partial extra',
      () => FamilyScenarios.mongoBaseWithExtra({ order: 'Rosales' })
    ],
    ['a random family', () => FamilyScenarios.mongoRandom()],
    ['a family with an empty extra', () => withStoredExtra({})],
    [
      'a family whose extra has only unknown fields',
      () => withStoredExtra({ legacyAudit: 123 })
    ],
    [
      'a family whose extra mixes known and unknown fields',
      () => withStoredExtra({ order: 'Rosales', legacyAudit: 123 })
    ]
  ])('matches the aggregate round-trip for %s', (_case, build) => {
    const document = build();

    expect(toFamilyReadView(document)).toEqual(domainRoundTrip(document));
  });

  it('reads a missing version as 0', () => {
    const { version: _version, ...document } = FamilyScenarios.mongoBase();

    const view = toFamilyReadView(document);

    expect(view.version).toBe(0);
    expect(view).toEqual(
      domainRoundTrip(document as unknown as MongoFamilyDocument)
    );
  });

  it('leaves extra out when the family has none', () => {
    const view = toFamilyReadView(FamilyScenarios.mongoBase());

    expect(view).not.toHaveProperty('extra');
  });

  it('leaves extra out when it holds only unknown fields', () => {
    const view = toFamilyReadView(withStoredExtra({ legacyAudit: 123 }));

    expect(view).not.toHaveProperty('extra');
  });

  it('reads a Binary UUID _id as its string form', () => {
    const document = FamilyScenarios.mongoBase();

    expect(toFamilyReadView(document).id).toBe(fromMongoId(document._id));
    expect(toFamilyReadView(document).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reads a string _id as is', () => {
    const id = random.uuid();
    const document = { ...FamilyScenarios.mongoBase(), _id: id };

    expect(toFamilyReadView(document).id).toBe(id);
    expect(toFamilyReadView(document)).toEqual(domainRoundTrip(document));
  });
});

// What a read with a narrowed projection gets back: `_id` and the fields.
const projected = (
  document: StoredFamilyDocument,
  fields: readonly FamilyField[]
): StoredFamilyDocument =>
  Object.fromEntries(
    Object.entries(document).filter(
      ([key]) => key === '_id' || fields.includes(key as FamilyField)
    )
  ) as StoredFamilyDocument;

describe('toFamilySparseView', () => {
  it('returns id and only the selected fields', () => {
    const document = FamilyScenarios.mongoBaseWithExtra();
    const fields: FamilyField[] = ['name', 'slug'];

    const view = toFamilySparseView(projected(document, fields), fields);
    const full = toFamilyReadView(document);

    expect(view).toEqual({ id: full.id, name: full.name, slug: full.slug });
  });

  it('leaves extra out when the family has none', () => {
    const document = FamilyScenarios.mongoBase();
    const fields: FamilyField[] = ['name', 'extra'];

    const view = toFamilySparseView(projected(document, fields), fields);

    expect(view).not.toHaveProperty('extra');
    expect(view).toHaveProperty('name');
  });

  it('reads a missing version as 0, like the full view', () => {
    const { version: _version, ...document } = FamilyScenarios.mongoBase();

    expect(toFamilySparseView(document, ['version']).version).toBe(0);
  });

  it.each([
    ['a base family', () => FamilyScenarios.mongoBase()],
    ['a family with extra', () => FamilyScenarios.mongoBaseWithExtra()]
  ])(
    'equals the full view when every field is selected for %s',
    (_case, build) => {
      const document = build();
      const fields = FAMILY_FIELDS.filter((field) => field !== 'id');

      expect(toFamilySparseView(document, fields)).toStrictEqual(
        toFamilyReadView(document)
      );
    }
  );
});
