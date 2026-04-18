import type { Collection, Document } from 'mongodb';

import { MongoFetchService } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoFetchService.js';

type TestEntity = {
  _id: string;
  metadata: Record<string, unknown>;
  name: string;
};

describe('MongoFetchService', () => {
  const findToArrayMock = jest.fn();
  const findMock = jest.fn();

  let collection: Collection<Document>;

  beforeEach(() => {
    jest.clearAllMocks();

    findMock.mockReturnValue({ toArray: findToArrayMock });

    collection = {
      find: findMock
    } as unknown as Collection<Document>;
  });

  it('should use find when options are empty', async () => {
    const documents: TestEntity[] = [
      { _id: '1', metadata: {}, name: 'first' },
      { _id: '2', metadata: {}, name: 'second' }
    ];
    findToArrayMock.mockResolvedValue(documents);

    const result = await MongoFetchService.fetch<TestEntity>({
      collection,
      options: {}
    });

    expect(result).toEqual(documents);
    expect(findMock).toHaveBeenCalledWith({});
    expect(findToArrayMock).toHaveBeenCalledTimes(1);
  });

  it('should use find with filter when options are provided', async () => {
    const documents: TestEntity[] = [{ _id: '1', metadata: {}, name: 'first' }];

    findToArrayMock.mockResolvedValue(documents);

    const options = { filter: { status: 'active' } };
    const result = await MongoFetchService.fetch<TestEntity>({
      collection,
      id: 'entity-id',
      options
    });

    expect(result).toEqual(documents);
    expect(findMock).toHaveBeenCalledWith({
      _id: expect.anything(),
      status: 'active'
    }, {});
    expect(findToArrayMock).toHaveBeenCalledTimes(1);
  });

  it('should use projection when fields are provided', async () => {
    findToArrayMock.mockResolvedValue([]);

    const options = { fields: ['name', 'status'] };

    await MongoFetchService.fetch<TestEntity>({
      collection,
      options
    });

    expect(findMock).toHaveBeenCalledWith(
      {},
      {
        projection: {
          _id: 1,
          metadata: 1,
          name: 1,
          status: 1
        }
      }
    );
  });
});