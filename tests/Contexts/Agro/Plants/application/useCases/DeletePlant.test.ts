import { DeletePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('DeletePlant use case', () => {
  const CURRENT_VERSION = 0;
  let repository: PlantRepositoryMock;
  let useCase: DeletePlant;
  const USERNAME = 'test-user';

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new DeletePlant({ plantRepository: repository });
  });

  it('should mark plant as deleted via updateWithDiff', async () => {
    const plant = PlantFactory.create();

    repository.addToStorage(plant);

    await useCase.execute(plant.id, USERNAME, [CURRENT_VERSION]);

    expect(repository.getStored(plant.id)?.isDeleted()).toBe(true);
    repository.assertUpdateCalled();
    repository.assertSaveNotCalled();
  });

  it('should store the deleting user and time as audit data with one read and one write', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    await useCase.execute(plant.id, 'deleter', [plant.version]);

    const stored = repository.getStoredPrimitives(plant.id);
    expect(stored?.metadata.updatedBy).toBe('deleter');
    expect(stored?.metadata.updatedAt.toISOString()).toBe(stored?.deletedAt);
    expect(stored?.metadata.createdBy).toBe(plant.metadata.createdBy);
    expect(stored?.version).toBe(plant.version + 1);
    repository.assertReadCalledTimes('findActiveById', 1);
    repository.assertUpdateCalledTimes(1);
  });

  it('should throw not found error if plant already deleted (repeat delete)', async () => {
    const plant = PlantFactory.create();
    plant.markAsDeleted('test-user');

    repository.addToStorage(plant);

    await expect(
      useCase.execute(plant.id, USERNAME, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw not found and not write if plant does not exist', async () => {
    await expect(
      useCase.execute(random.uuid(), USERNAME, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);

    repository.assertSaveNotCalled();
    repository.assertUpdateNotCalled();
  });

  it('should bump the stored version when soft-deleting with the current version', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    await useCase.execute(plant.id, USERNAME, [plant.version]);

    expect(repository.getStored(plant.id)?.version).toBe(plant.version + 1);
  });

  it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    await expect(
      useCase.execute(plant.id, USERNAME, [plant.version + 1])
    ).rejects.toBeInstanceOf(DomainStaleVersionException);

    repository.assertUpdateNotCalled();
    expect(repository.getStored(plant.id)?.isDeleted()).toBe(false);
  });

  it('should throw DomainNotFoundException (not stale) for a soft-deleted plant with a wrong version', async () => {
    const plant = PlantFactory.create();
    plant.markAsDeleted('test-user');
    repository.addToStorage(plant);

    await expect(
      useCase.execute(plant.id, USERNAME, [999])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should read once, write once and never run the existence check on success', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    await useCase.execute(plant.id, USERNAME, [plant.version]);

    repository.assertReadCalledTimes('findActiveById', 1);
    repository.assertUpdateCalledTimes(1);
    repository.assertExistenceCountCalledTimes(0);
  });

  it('should throw not found if updateWithDiff rejects with DomainNotFoundException (concurrent delete)', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainNotFoundException(`Plant ${plant.id} not found`)
      );

    await expect(
      useCase.execute(plant.id, USERNAME, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  describe('expected version lists', () => {
    it('should proceed when the list contains the current version', async () => {
      const plant = PlantFactory.create();
      repository.addToStorage(plant);

      await useCase.execute(plant.id, USERNAME, [
        plant.version + 1,
        plant.version
      ]);

      expect(repository.getStored(plant.id)?.isDeleted()).toBe(true);
    });

    it('should answer stale for an empty list without writing', async () => {
      const plant = PlantFactory.create();
      repository.addToStorage(plant);

      const remove = useCase.execute(plant.id, USERNAME, []);

      await expect(remove).rejects.toBeInstanceOf(DomainStaleVersionException);
      repository.assertUpdateNotCalled();
    });

    it('should answer not found before checking an empty list', async () => {
      const plant = PlantFactory.create();

      const remove = useCase.execute(plant.id, USERNAME, []);

      await expect(remove).rejects.toBeInstanceOf(DomainNotFoundException);
    });
  });
});
