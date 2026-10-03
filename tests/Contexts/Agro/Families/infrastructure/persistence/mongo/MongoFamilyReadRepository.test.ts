import type { Binary, MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { FamilyReadRepository } from '../../../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import type { Family } from '../../../../../../../src/Contexts/Agro/Families/domain/entities/Family.js';
import type { FamilyRepository } from '../../../../../../../src/Contexts/Agro/Families/domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyFilter } from '../../../../../../../src/Contexts/Agro/Families/domain/types/FamilyFilter.js';
import { toFamilyReadView } from '../../../../../../../src/Contexts/Agro/Families/infrastructure/persistence/familyReadViewMapper.js';
import { familyPersistenceMapper } from '../../../../../../../src/Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { QueryOptions } from '../../../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { DBClientFactory } from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';
import { SOURCE_ROOT } from '../../../../../../shared/sourceRoot.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { FamilyScenarios } from '../../../domain/mothers/FamilyScenarios.js';

let container: AppContainer;
let readRepository: FamilyReadRepository;
let writeRepository: FamilyRepository;
let environmentArranger: EnvironmentArranger;
let client: MongoClient;

type StoredId = { _id: Binary | string };

const viewOf = (family: Family) =>
  toFamilyReadView(familyPersistenceMapper.toMongoDocument(family));

const saveAll = async (families: Family[]): Promise<void> => {
  for (const family of families) {
    await writeRepository.save(family);
  }
};

describe('MongoFamilyReadRepository', () => {
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
    readRepository = container.resolve<FamilyReadRepository>(
      'familyReadRepository'
    );
    writeRepository = container.resolve<FamilyRepository>('familyRepository');
  });

  beforeEach(async () => {
    await environmentArranger.arrange();
  });

  afterAll(async () => {
    await environmentArranger.arrange();
    await environmentArranger.close();
    await client.close();
  });

  describe('findById and findBySlug', () => {
    it('return the same stored family', async () => {
      const family = FamilyScenarios.domainBaseWithExtra();
      await saveAll([family, FamilyScenarios.domainRandom()]);

      const byId = await readRepository.findById(family.idValue);
      const bySlug = await readRepository.findBySlug(family.slug);

      expect(byId).toEqual(viewOf(family));
      expect(bySlug).toEqual(byId);
    });

    it('return null for an unknown id', async () => {
      await expect(readRepository.findById(random.uuid())).resolves.toBeNull();
    });

    it('return null for an unknown slug', async () => {
      await expect(
        readRepository.findBySlug('unknown-family')
      ).resolves.toBeNull();
    });

    it('leave out stored fields that are not in the contract', async () => {
      const family = FamilyScenarios.domainBase();
      await saveAll([family]);
      await client
        .db()
        .collection<StoredId>('families')
        .updateOne(
          { _id: toMongoId(family.idValue) },
          { $set: { internalNote: 'not for clients' } }
        );

      const view = await readRepository.findById(family.idValue);

      expect(view).not.toHaveProperty('internalNote');
      expect(view).toEqual(viewOf(family));
    });
  });

  describe('findAll', () => {
    const idsOf = (items: Array<{ id: string }>): string[] =>
      items.map(({ id }) => id);

    const families = [
      FamilyScenarios.domainRandom({ name: 'Solanaceae', slug: 'solanaceae' }),
      FamilyScenarios.domainRandom({ name: 'asteraceae', slug: 'asteraceae' }),
      FamilyScenarios.domainRandom({ name: 'Rosaceae', slug: 'rosaceae' })
    ];

    beforeEach(async () => {
      await saveAll(families);
    });

    it.each<[string, QueryOptions<FamilyFilter>]>([
      ['no options', {}],
      ['sort by name', { sort: { name: 'asc' } }],
      ['sort by name in reverse', { sort: { name: 'desc' } }],
      [
        'pagination',
        { sort: { slug: 'asc' }, pagination: { page: 2, limit: 2 } }
      ],
      ['a name filter', { filter: { name: { contains: 'aceae' } } }],
      ['a slug filter', { filter: { slug: { eq: 'rosaceae' } } }]
    ])('answers like the write repository for %s', async (_case, options) => {
      const read = await readRepository.findAll(options);
      const write = await writeRepository.findAll(options);

      expect(idsOf(read.data)).toEqual(idsOf(write.data));
      expect(read.pagination).toEqual(write.pagination);
    });
  });

  it('returns an empty page with correct metadata for an empty collection', async () => {
    await expect(readRepository.findAll({})).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, totalPages: 0, totalItems: 0 }
    });
  });
});
