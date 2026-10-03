import { MongoClient } from 'mongodb';

import type { MongoConfig } from '../../../../../src/shared/infrastructure/persistence/mongo/interfaces/index.js';
import { MongoClientFactory } from '../../../../../src/shared/infrastructure/persistence/mongo/MongoClientFactory.js';

const createIndex = jest.fn();
const collection = jest.fn(() => ({ createIndex }));
const db = jest.fn(() => ({ collection }));
const connect = jest.fn(() => Promise.resolve());
const close = jest.fn(() => Promise.resolve());

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(() => ({ connect, close, db }))
}));

const buildConfig = (): MongoConfig => ({
  connection: 'mongodb',
  url: 'localhost:27017',
  db: 'agro_test',
  username: '',
  password: '',
  appName: '',
  replicaSet: '',
  connectionString: 'mongodb://localhost:27017'
});

describe('MongoClientFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only connect, never touching indexes', async () => {
    await MongoClientFactory.createClient('indexes-ctx', buildConfig());

    expect(connect).toHaveBeenCalledTimes(1);
    expect(db).not.toHaveBeenCalled();
    expect(collection).not.toHaveBeenCalled();
    expect(createIndex).not.toHaveBeenCalled();
  });

  it('should reuse the cached client of a context without reconnecting', async () => {
    const first = await MongoClientFactory.createClient(
      'cached-ctx',
      buildConfig()
    );
    connect.mockClear();

    const second = await MongoClientFactory.createClient(
      'cached-ctx',
      buildConfig()
    );

    expect(second).toBe(first);
    expect(connect).not.toHaveBeenCalled();
    expect(jest.mocked(MongoClient)).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    await MongoClientFactory.closeClient('indexes-ctx');
    await MongoClientFactory.closeClient('cached-ctx');
  });
});
