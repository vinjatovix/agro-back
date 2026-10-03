import type { Collection, Document, MongoClient } from 'mongodb';
import { MongoPageQuery } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoPageQuery.js';
import { DBClientFactory } from '../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';

type StoredItem = {
  _id: string;
  name: string;
  details: { label: string };
  secret?: string;
};

const COLLECTION = 'mongoPageQueryTest';

const item = (index: number, name: string): StoredItem => ({
  _id: `item-${index}`,
  name,
  details: { label: name.toUpperCase() },
  secret: 'internal'
});

const ids = (documents: StoredItem[]): string[] =>
  documents.map(({ _id }) => _id);

let client: MongoClient;
let collection: Collection<Document>;
let storedItems: Collection<StoredItem>;

describe('MongoPageQuery', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      createTestDBConfig()
    );
    collection = client.db().collection(COLLECTION);
    storedItems = client.db().collection<StoredItem>(COLLECTION);
  });

  beforeEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await collection.drop().catch(() => undefined);
    await client.close();
  });

  const seed = async (names: string[]): Promise<void> => {
    await storedItems.insertMany(names.map((name, index) => item(index, name)));
  };

  it('uses page 1 and a limit of 20 by default', async () => {
    await seed(['b', 'a', 'c']);

    const { documents, pagination } = await MongoPageQuery.find<StoredItem>(
      collection,
      { filter: {} }
    );

    expect(documents).toHaveLength(3);
    expect(pagination).toEqual({
      page: 1,
      limit: 20,
      totalPages: 1,
      totalItems: 3
    });
  });

  it('returns the last partial page with the full page metadata', async () => {
    await seed(['a', 'b', 'c', 'd', 'e']);

    const { documents, pagination } = await MongoPageQuery.find<StoredItem>(
      collection,
      {
        filter: {},
        sort: { name: 'asc' },
        pagination: { page: 3, limit: 2 }
      }
    );

    expect(documents.map(({ name }) => name)).toEqual(['e']);
    expect(pagination).toEqual({
      page: 3,
      limit: 2,
      totalPages: 3,
      totalItems: 5
    });
  });

  it('returns no documents and correct metadata for an empty collection', async () => {
    const result = await MongoPageQuery.find<StoredItem>(collection, {
      filter: {}
    });

    expect(result).toEqual({
      documents: [],
      pagination: { page: 1, limit: 20, totalPages: 0, totalItems: 0 }
    });
  });

  it('counts and lists only the documents matching the filter', async () => {
    await seed(['keep', 'drop', 'keep']);

    const { documents, pagination } = await MongoPageQuery.find<StoredItem>(
      collection,
      { filter: { name: 'keep' } }
    );

    expect(ids(documents)).toEqual(['item-0', 'item-2']);
    expect(pagination.totalItems).toBe(2);
  });

  it('sorts by the stored path the sort-field mapper returns', async () => {
    await seed(['b', 'c', 'a']);

    const { documents } = await MongoPageQuery.find<StoredItem>(collection, {
      filter: {},
      sort: { label: 'desc' },
      toSortField: (key) => `details.${key}`
    });

    expect(documents.map(({ name }) => name)).toEqual(['c', 'b', 'a']);
  });

  it('ignores letter case when sorting with a collation', async () => {
    await seed(['beta', 'Alpha', 'alpha2', 'Beta2']);

    const { documents } = await MongoPageQuery.find<StoredItem>(collection, {
      filter: {},
      sort: { name: 'asc' },
      collation: { locale: 'es', strength: 2 }
    });

    expect(documents.map(({ name }) => name)).toEqual([
      'Alpha',
      'alpha2',
      'beta',
      'Beta2'
    ]);
  });

  it('drops the keys a projection leaves out and always returns _id', async () => {
    await seed(['a']);

    const { documents } = await MongoPageQuery.find<StoredItem>(collection, {
      filter: {},
      projection: { name: 1 }
    });

    expect(documents).toEqual([{ _id: 'item-0', name: 'a' }]);
  });
});
