import { DeletePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('DeletePlant use case', () => {
  let repository: PlantRepositoryMock;
  let useCase: DeletePlant;
  const USERNAME = 'test-user';

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new DeletePlant(repository);
  });

  it('should mark plant as deleted via updateWithDiff', async () => {
    const plant = PlantFactory.create();

    repository.addToStorage(plant);

    await useCase.execute(plant.id, USERNAME);

    expect(plant.isDeleted()).toBe(true);
    repository.assertUpdateCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw not found error if plant already deleted (repeat delete)', async () => {
    const plant = PlantFactory.create();
    plant.markAsDeleted();

    repository.addToStorage(plant);

    await expect(useCase.execute(plant.id, USERNAME)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
    repository.assertUpdateNotCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw not found and not write if plant does not exist', async () => {
    await expect(
      useCase.execute(random.uuid(), USERNAME)
    ).rejects.toBeInstanceOf(DomainNotFoundException);

    repository.assertSaveNotCalled();
    repository.assertUpdateNotCalled();
  });

  it('should throw not found if updateWithDiff rejects with DomainNotFoundException (concurrent delete)', async () => {
    const plant = PlantFactory.create();
    repository.addToStorage(plant);

    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainNotFoundException('Plant', plant.id.toString())
      );

    await expect(useCase.execute(plant.id, USERNAME)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });
});
