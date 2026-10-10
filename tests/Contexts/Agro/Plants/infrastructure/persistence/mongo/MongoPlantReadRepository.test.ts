import {
  type Binary,
  Collection,
  type FindOptions,
  type MongoClient,
  type UpdateFilter
} from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type {
  PlantField,
  PlantReadRepository
} from '../../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { Plant } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import {
  type PlantKnowledgePrimitives,
  PlantStatus
} from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/index.js';
import type { PlantFilter } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import type { PlantRepository } from '../../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantKnowledge } from '../../../../../../../src/Contexts/Agro/Plants/domain/value-objects/index.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { QueryOptions } from '../../../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { DBClientFactory } from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';
import { SOURCE_ROOT } from '../../../../../../shared/sourceRoot.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantReadViewMother } from '../../../application/queries/PlantReadViewMother.js';
import { PlantFactory } from '../../../domain/mothers/PlantFactory.js';
import { PlantIdentityBuilder } from '../../../domain/mothers/PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from '../../../domain/mothers/PlantKnowledgeBuilder.js';
import {
  type PlantResource,
  PlantResourceBuilder
} from '../../../domain/mothers/PlantResourceBuilder.js';

type PlantQuery = QueryOptions<PlantFilter, PlantField, never>;

let container: AppContainer;
let readRepository: PlantReadRepository;
let writeRepository: PlantRepository;
let environmentArranger: EnvironmentArranger;
let client: MongoClient;

type StoredId = { _id: Binary | string };

const saveAll = async (plants: Plant[]): Promise<void> => {
  for (const plant of plants) {
    await writeRepository.save(plant);
  }
};

const deleted = (plant: Plant): Plant => {
  plant.markAsDeleted('test-user');

  return plant;
};

const named = (primary: string, scientificName: string): Plant =>
  PlantFactory.random({
    identity: PlantIdentityBuilder.named(primary, scientificName)
  });

describe('MongoPlantReadRepository', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      createTestDBConfig()
    );

    container = await createAppContainer({
      db: client.db(),
      client,
      sourceRoot: SOURCE_ROOT
    });
    environmentArranger = container.resolve<EnvironmentArranger>(
      'environmentArranger'
    );
    readRepository = container.resolve<PlantReadRepository>(
      'plantReadRepository'
    );
    writeRepository = container.resolve<PlantRepository>('plantRepository');
  });

  beforeEach(async () => {
    await environmentArranger.arrange();
  });

  afterAll(async () => {
    await environmentArranger.arrange();
    await environmentArranger.close();
    await client.close();
  });

  describe('findById', () => {
    it('returns the stored plant as a read view', async () => {
      const plant = PlantFactory.full();
      await saveAll([plant]);

      await expect(readRepository.findById(plant.id)).resolves.toEqual(
        PlantReadViewMother.from(plant)
      );
    });

    it('returns a deleted plant', async () => {
      const plant = deleted(PlantFactory.random());
      await saveAll([plant]);

      const view = await readRepository.findById(plant.id);

      expect(view?.status).toBe('DELETED');
    });

    it('returns null when the plant does not exist', async () => {
      await expect(readRepository.findById(random.uuid())).resolves.toBeNull();
    });

    it('leaves out stored fields that are not in the contract', async () => {
      const plant = PlantFactory.tomato();
      await saveAll([plant]);
      await client
        .db()
        .collection<StoredId>('plants')
        .updateOne(
          { _id: toMongoId(plant.id) },
          { $set: { internalNote: 'not for clients' } }
        );

      const view = await readRepository.findById(plant.id);

      expect(view).not.toHaveProperty('internalNote');
      expect(view).toEqual(PlantReadViewMother.from(plant));
    });
  });

  describe('reads with a fieldset', () => {
    it.each(['findById', 'findActiveById'] as const)(
      '%s reads only id and the selected fields',
      async (method) => {
        const plant = PlantFactory.full();
        await saveAll([plant]);

        const view = await readRepository[method](plant.id, {
          fields: ['identity']
        });
        const full = PlantReadViewMother.from(plant);

        expect(view).toStrictEqual({ id: full.id, identity: full.identity });
      }
    );

    it('reads only id for an empty fieldset', async () => {
      const plant = PlantFactory.tomato();
      await saveAll([plant]);

      await expect(
        readRepository.findById(plant.id, { fields: [] })
      ).resolves.toStrictEqual({ id: plant.id });
    });

    it('never reads a stored field outside the contract', async () => {
      const plant = PlantFactory.tomato();
      await saveAll([plant]);
      await client
        .db()
        .collection<StoredId>('plants')
        .updateOne(
          { _id: toMongoId(plant.id) },
          { $set: { internalNote: 'not for clients' } }
        );

      const view = await readRepository.findById(plant.id, {
        fields: ['status']
      });

      expect(view).toStrictEqual({ id: plant.id, status: 'ACTIVE' });
    });
  });

  describe('findActiveById', () => {
    it('returns an active plant', async () => {
      const plant = PlantFactory.random();
      await saveAll([plant]);

      await expect(readRepository.findActiveById(plant.id)).resolves.toEqual(
        PlantReadViewMother.from(plant)
      );
    });

    it('returns null for a deleted plant', async () => {
      const plant = deleted(PlantFactory.random());
      await saveAll([plant]);

      await expect(readRepository.findActiveById(plant.id)).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    const idsOf = (items: Array<{ id: string }>): string[] =>
      items.map(({ id }) => id);

    const expectSameAsWriteRepository = async (
      options: PlantQuery
    ): Promise<void> => {
      const read = await readRepository.findAll(options);
      const write = await writeRepository.findAll(options);

      expect(idsOf(read.data)).toEqual(idsOf(write.data));
      expect(read.pagination).toEqual(write.pagination);
    };

    beforeEach(async () => {
      await saveAll([
        named('Tomate', 'Solanum lycopersicum'),
        named('apio', 'Apium graveolens'),
        named('Berenjena', 'Solanum melongena'),
        named('lechuga (romana)', 'Lactuca sativa'),
        deleted(named('Zanahoria', 'Daucus carota'))
      ]);
    });

    it.each<[string, PlantQuery]>([
      ['no options', {}],
      ['sort by name', { sort: { name: 'asc' } }],
      ['sort by name in reverse', { sort: { name: 'desc' } }],
      ['sort by scientific name', { sort: { scientificName: 'asc' } }],
      [
        'sort by scientific name in reverse',
        { sort: { scientificName: 'desc' } }
      ],
      [
        'pagination',
        { sort: { name: 'asc' }, pagination: { page: 2, limit: 2 } }
      ],
      [
        'a text filter with regex special characters',
        { filter: { identity: { contains: '(romana)' } } }
      ],
      [
        'the active status filter',
        { filter: { status: { eq: PlantStatus.ACTIVE } } }
      ]
    ])('answers like the write repository for %s', async (_case, options) => {
      await expectSameAsWriteRepository(options);
    });

    it('reads only id and the selected fields, keeping items, order and paging', async () => {
      const options: PlantQuery = {
        sort: { name: 'asc' },
        pagination: { page: 1, limit: 2 }
      };

      const full = await readRepository.findAll(options);
      const sparse = await readRepository.findAll({
        ...options,
        fields: ['identity']
      });

      expect(idsOf(sparse.data)).toEqual(idsOf(full.data));
      expect(sparse.pagination).toEqual(full.pagination);
      expect(sparse.data).toEqual(
        full.data.map(({ id, identity }) => ({ id, identity }))
      );
    });

    it('filters out deleted plants when asked', async () => {
      const { data } = await readRepository.findAll({
        filter: { status: { eq: PlantStatus.ACTIVE } }
      });

      expect(data.map((view) => view.status)).not.toContain('DELETED');
      expect(data).toHaveLength(4);
    });
  });

  describe('image', () => {
    const withResources = (resources: PlantResource[]): Plant =>
      PlantFactory.random({
        knowledge: PlantKnowledgeBuilder.withResources(resources)
      });

    const storedKnowledge = async (
      plant: Plant
    ): Promise<PlantKnowledgePrimitives> => {
      const document = await client
        .db()
        .collection<StoredId & { knowledge?: PlantKnowledgePrimitives }>(
          'plants'
        )
        .findOne({ _id: toMongoId(plant.id) });

      return document?.knowledge ?? {};
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('reads the first image resource without fetching knowledge', async () => {
      const first = PlantResourceBuilder.image();
      const plant = withResources([PlantResourceBuilder.video(), first]);
      await saveAll([plant]);
      const findOne = jest.spyOn(Collection.prototype, 'findOne');

      const view = await readRepository.findById(plant.id, {
        fields: ['image']
      });

      const [, options] = findOne.mock.calls[0] ?? [];
      const projection = (options as FindOptions | undefined)?.projection;
      expect(projection).toHaveProperty('image');
      expect(projection).not.toHaveProperty('knowledge');
      await expect(findOne.mock.results[0]?.value).resolves.not.toHaveProperty(
        'knowledge'
      );
      expect(view).toStrictEqual({
        id: plant.id,
        image: { url: first.url, title: first.title, source: first.source }
      });
    });

    // No `Plant` can be saved without an image, so these break stored data:
    // the read side copies it, and the response check rejects the `null`.
    it.each<[string, UpdateFilter<StoredId>]>([
      [
        'no image resource',
        {
          $set: {
            'knowledge.resources': [
              PlantResourceBuilder.video(),
              PlantResourceBuilder.article()
            ]
          }
        }
      ],
      ['no knowledge', { $unset: { knowledge: '' } }]
    ])(
      'reads image as null for a stored plant with %s',
      async (_case, update) => {
        const plant = withResources([PlantResourceBuilder.image()]);
        await saveAll([plant]);
        await client
          .db()
          .collection<StoredId>('plants')
          .updateOne({ _id: toMongoId(plant.id) }, update);

        await expect(
          readRepository.findById(plant.id, { fields: ['image'] })
        ).resolves.toStrictEqual({ id: plant.id, image: null });
      }
    );

    it('leaves image out when the fieldset does not select it', async () => {
      const plant = withResources([PlantResourceBuilder.image()]);
      await saveAll([plant]);

      const view = await readRepository.findById(plant.id, {
        fields: ['identity']
      });

      expect(view).not.toHaveProperty('image');
    });

    it('reads both knowledge and image without a fieldset', async () => {
      const plant = withResources([PlantResourceBuilder.image()]);
      await saveAll([plant]);

      const view = await readRepository.findById(plant.id);

      expect(view?.knowledge).toEqual(await storedKnowledge(plant));
      expect(view?.image).toEqual(plant.knowledge.primaryImage());
    });

    it.each<[string, () => PlantResource[]]>([
      [
        'a video, then two images',
        () => [
          PlantResourceBuilder.video(),
          PlantResourceBuilder.image(),
          PlantResourceBuilder.image()
        ]
      ],
      [
        'images without title or source',
        () => [PlantResourceBuilder.bareImage(), PlantResourceBuilder.image()]
      ]
    ])(
      'reads the same image as the domain rule for %s',
      async (_case, resources) => {
        const plant = withResources(resources());
        await saveAll([plant]);
        const expected = PlantKnowledge.fromPrimitives(
          await storedKnowledge(plant)
        ).primaryImage();

        const sparse = await readRepository.findById(plant.id, {
          fields: ['image']
        });
        const full = await readRepository.findById(plant.id);
        const { data } = await readRepository.findAll({ fields: ['image'] });

        expect(sparse?.image).toEqual(expected);
        expect(full?.image).toEqual(expected);
        expect(data).toStrictEqual([{ id: plant.id, image: expected }]);
      }
    );

    // The API only stores lowercase types, but a document written outside it
    // could hold `Image`, which the case-insensitive listing collation must
    // not take for an image.
    it('never takes an "Image" (other case) written outside the API', async () => {
      const image = PlantResourceBuilder.image();
      const plant = withResources([image]);
      await saveAll([plant]);
      await client
        .db()
        .collection<StoredId>('plants')
        .updateOne(
          { _id: toMongoId(plant.id) },
          {
            $set: {
              'knowledge.resources': [
                { ...PlantResourceBuilder.image(), type: 'Image' },
                image
              ]
            }
          }
        );
      const expected = {
        url: image.url,
        title: image.title,
        source: image.source
      };

      const sparse = await readRepository.findById(plant.id, {
        fields: ['image']
      });
      const { data } = await readRepository.findAll({ fields: ['image'] });

      expect(sparse?.image).toEqual(expected);
      expect(data).toStrictEqual([{ id: plant.id, image: expected }]);
    });
  });

  it('returns an empty page with correct metadata for an empty collection', async () => {
    await expect(readRepository.findAll({})).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, totalPages: 0, totalItems: 0 }
    });
  });
});
