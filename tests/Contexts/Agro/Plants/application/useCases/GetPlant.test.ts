import { GetPlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/GetPlant.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('GetPlant', () => {
  let repository: PlantRepositoryMock;
  let getPlant: GetPlant;
  const USER: UserSessionInfo = {
    username: 'user',
    id: random.uuid(),
    email: 'user@example.com',
    roles: ['user']
  };
  const ADMIN: UserSessionInfo = {
    username: 'admin',
    id: random.uuid(),
    email: 'admin@example.com',
    roles: ['admin']
  };
  const COLLABORATOR: UserSessionInfo = {
    username: 'collaborator',
    id: random.uuid(),
    email: 'collaborator@example.com',
    roles: ['collaborator']
  };

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    getPlant = new GetPlant(repository);
  });

  it('should search only active plants for regular users', async () => {
    const plant = PlantFactory.tomato();
    repository.addToStorage(plant);

    await getPlant.execute(plant.id, USER);

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should throw error when plant does not exist', async () => {
    const id = random.uuid();
    await expect(getPlant.execute(id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(id);
  });

  it('should throw error if plant is deleted and user tries to access it', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted('test-user');
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should only look up active plants for anonymous requests', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted('test-user');
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should return plant if it is deleted but user has admin role', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted('test-user');
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, ADMIN)).resolves.toEqual(plant);

    repository.assertFindByIdHasBeenCalledWith(plant.id);
    repository.assertFindActiveByIdNotCalled();
  });

  it('should return plant if it is deleted but user has collaborator role', async () => {
    const plant = PlantFactory.tomato();
    plant.markAsDeleted('test-user');
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, COLLABORATOR)).resolves.toEqual(
      plant
    );

    repository.assertFindByIdHasBeenCalledWith(plant.id);
  });
});
