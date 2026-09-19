import { GetPlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/GetPlant.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('GetPlant', () => {
  let repository: PlantRepositoryMock;
  let getPlant: GetPlant;
  const USER = {
    roles: ['user']
  } as UserSessionInfo;
  const ADMIN = {
    roles: ['admin']
  } as UserSessionInfo;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    getPlant = new GetPlant(repository);
  });

  it('should search plant in repository using the provided id', async () => {
    const plant = PlantFactory.tomato();
    repository.addToStorage(plant);

    await getPlant.execute(plant.id.value, USER);

    repository.assertFindByIdHasBeenCalledWith(plant.id.value);
  });

  it('should throw error when plant does not exist', async () => {
    const id = random.uuid();
    await expect(getPlant.execute(id, USER)).rejects.toThrow(
      `Plant not found: ${id}`
    );

    repository.assertFindByIdHasBeenCalledWith(id);
  });

  it('should throw error if plant is deleted and user tries to access it', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id.value, USER)).rejects.toThrow(
      `Plant not found: ${plant.id.value}`
    );

    repository.assertFindByIdHasBeenCalledWith(plant.id.value);
  });

  it('should return plant if it is deleted but user has admin role', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id.value, ADMIN)).resolves.toEqual(
      plant
    );

    repository.assertFindByIdHasBeenCalledWith(plant.id.value);
  });
});
