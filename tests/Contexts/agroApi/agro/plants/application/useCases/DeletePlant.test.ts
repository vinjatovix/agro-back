import { DeletePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/DeletePlant.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantMother } from '../../domain/mothers/PlantMother.js';

describe('DeletePlant use case', () => {
  let repository: PlantRepositoryMock;
  let useCase: DeletePlant;
  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new DeletePlant(repository);
  });

  it('should mark plant as deleted', async () => {
    const plant = PlantMother.create();

    repository.addToStorage(plant);

    await useCase.execute(plant.id.value);

    expect(plant.isDeleted()).toBe(true);
    repository.assertSaveHasBeenCalledWith(plant);
  });

  it('should not fail if plant already deleted', async () => {
    const plant = PlantMother.create();
    plant.markAsDeleted();

    repository.addToStorage(plant);

    await useCase.execute(plant.id.value);

    repository.assertSaveNotCalled();
  });

  it('should throw if plant does not exist', async () => {
    await expect(useCase.execute('non-existent-id')).rejects.toThrow();
  });
});
