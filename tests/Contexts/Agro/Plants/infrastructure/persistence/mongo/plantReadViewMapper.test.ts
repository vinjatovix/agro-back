import {
  PLANT_FIELDS,
  type PlantField
} from '../../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { Plant } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import {
  toPlantReadView,
  toPlantSparseView,
  type StoredPlantDocument
} from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.js';
import type { MongoPlantDocument } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/types/MongoPlantDocument.js';
import { plantDomainMapper } from '../../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { plantPersistenceMapper } from '../../../../../../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { PlantFactory } from '../../../domain/mothers/PlantFactory.js';
import { PlantIdentityBuilder } from '../../../domain/mothers/PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from '../../../domain/mothers/PlantKnowledgeBuilder.js';

// The body sent before the read bypass: the stored document round-tripped
// through the aggregate. The read view must equal it for every document.
const domainRoundTrip = (document: MongoPlantDocument): unknown =>
  plantDomainMapper.toPrimitives(
    plantPersistenceMapper.fromMongoDocument(document)
  );

const stored = (plant: Plant): MongoPlantDocument =>
  plantPersistenceMapper.toMongoDocument(plant);

const without = <K extends keyof MongoPlantDocument>(
  document: MongoPlantDocument,
  key: K
): MongoPlantDocument => {
  const copy = { ...document };
  delete copy[key];

  return copy;
};

const deletedPlant = (): Plant => {
  const plant = PlantFactory.random();
  plant.markAsDeleted('test-user');

  return plant;
};

describe('toPlantReadView', () => {
  describe('matches the aggregate round-trip', () => {
    it.each([
      ['a generic plant', () => PlantFactory.create()],
      ['a random plant', () => PlantFactory.random()],
      ['a tomato', () => PlantFactory.tomato()],
      ['a lettuce', () => PlantFactory.lettuce()],
      ['a fully described plant', () => PlantFactory.full()],
      [
        'a plant with full knowledge',
        () => PlantFactory.random({ knowledge: PlantKnowledgeBuilder.full() })
      ],
      [
        'a plant with aliases',
        () =>
          PlantFactory.random({ identity: PlantIdentityBuilder.withAliases() })
      ],
      ['a deleted plant', deletedPlant]
    ])('for %s', (_case, build) => {
      const document = stored(build());

      expect(toPlantReadView(document)).toEqual(domainRoundTrip(document));
    });

    it('when the stored version is missing (read as 0)', () => {
      const document = without(stored(PlantFactory.tomato()), 'version');

      const view = toPlantReadView(document);

      expect(view.version).toBe(0);
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('when the stored deletedAt is missing (sent as null)', () => {
      const document = without(stored(PlantFactory.tomato()), 'deletedAt');

      const view = toPlantReadView(document);

      expect(view.deletedAt).toBeNull();
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('when the stored knowledge is missing (sent as {})', () => {
      const document = without(stored(PlantFactory.tomato()), 'knowledge');

      const view = toPlantReadView(document);

      expect(view.knowledge).toEqual({});
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('when the stored aliases are missing (key left out, never null)', () => {
      const document = stored(PlantFactory.tomato());

      const view = toPlantReadView(document);

      expect(view.identity.name).not.toHaveProperty('aliases');
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('for a deleted plant, keeping its status and deletion date', () => {
      const document = stored(deletedPlant());

      const view = toPlantReadView(document);

      expect(view.status).toBe('DELETED');
      expect(view.deletedAt).toEqual(expect.any(String));
      expect(view).toEqual(domainRoundTrip(document));
    });
  });

  describe('id', () => {
    it('reads a Binary UUID _id as its string form', () => {
      const plant = PlantFactory.tomato();

      expect(toPlantReadView(stored(plant)).id).toBe(plant.id);
    });

    it('reads a string _id as is', () => {
      const plant = PlantFactory.tomato();
      const document = { ...stored(plant), _id: plant.id };

      expect(toPlantReadView(document).id).toBe(plant.id);
      expect(toPlantReadView(document)).toEqual(domainRoundTrip(document));
    });
  });

  it('keeps the family as the stored plain id', () => {
    const plant = PlantFactory.tomato();

    expect(toPlantReadView(stored(plant)).identity.family).toBe(
      plant.identity.family
    );
  });

  it('builds no aggregate: a document breaking a business rule is copied', () => {
    const document = stored(PlantFactory.tomato());
    const broken = {
      ...document,
      traits: {
        ...document.traits,
        size: { ...document.traits.size, height: { min: 50, max: 10 } }
      }
    };

    expect(toPlantReadView(broken).traits.size.height).toEqual({
      min: 50,
      max: 10
    });
  });
});

// What a read with a narrowed projection gets back: `_id` and the fields.
const projected = (
  document: StoredPlantDocument,
  fields: readonly PlantField[]
): StoredPlantDocument =>
  Object.fromEntries(
    Object.entries(document).filter(
      ([key]) => key === '_id' || fields.includes(key as PlantField)
    )
  ) as StoredPlantDocument;

describe('toPlantSparseView', () => {
  it('returns id and only the selected fields', () => {
    const document = stored(PlantFactory.tomato());
    const fields: PlantField[] = ['identity', 'traits'];

    const view = toPlantSparseView(projected(document, fields), fields);

    expect(Object.keys(view).sort()).toEqual(['id', 'identity', 'traits']);
    expect(view.identity).toEqual(toPlantReadView(document).identity);
  });

  it('returns only id for an empty fieldset', () => {
    const document = stored(PlantFactory.random());

    expect(toPlantSparseView(projected(document, []), [])).toEqual({
      id: toPlantReadView(document).id
    });
  });

  it('applies the same defaults as the full view', () => {
    const {
      version: _version,
      status: _status,
      knowledge: _knowledge,
      ...legacy
    } = stored(PlantFactory.random());
    const document = legacy as StoredPlantDocument;
    const fields: PlantField[] = ['version', 'status', 'knowledge'];

    const view = toPlantSparseView(projected(document, fields), fields);
    const full = toPlantReadView(document);

    expect(view).toEqual({
      id: full.id,
      version: full.version,
      status: full.status,
      knowledge: full.knowledge
    });
  });

  it.each([
    ['a live plant', () => PlantFactory.full()],
    ['a deleted plant', deletedPlant]
  ])(
    'equals the full view when every field is selected for %s',
    (_case, build) => {
      const document = stored(build());
      const fields = PLANT_FIELDS.filter((field) => field !== 'id');

      expect(toPlantSparseView(document, fields)).toEqual(
        toPlantReadView(document)
      );
    }
  );
});
