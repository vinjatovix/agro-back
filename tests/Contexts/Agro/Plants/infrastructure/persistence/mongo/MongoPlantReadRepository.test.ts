import type { Binary, MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { PlantReadRepository } from '../../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { Plant } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantFilter } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import type { PlantRepository } from '../../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
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
      options: QueryOptions<PlantFilter>
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

    it.each<[string, QueryOptions<PlantFilter>]>([
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

    it('filters out deleted plants when asked', async () => {
      const { data } = await readRepository.findAll({
        filter: { status: { eq: PlantStatus.ACTIVE } }
      });

      expect(data.map((view) => view.status)).not.toContain('DELETED');
      expect(data).toHaveLength(4);
    });
  });

  it('returns an empty page with correct metadata for an empty collection', async () => {
    await expect(readRepository.findAll({})).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, totalPages: 0, totalItems: 0 }
    });
  });
});
