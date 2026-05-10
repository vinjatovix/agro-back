import { ListPlants } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/ListPlants.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('ListPlants', () => {
  let repository: PlantRepositoryMock;
  let listPlants: ListPlants;
  const USER = {
    roles: ['user']
  } as UserSessionInfo;
  const ADMIN = {
    roles: ['admin']
  } as UserSessionInfo;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    listPlants = new ListPlants(repository);
  });

  it('should call repository with all plants for admin users', async () => {
    const plant1 = PlantFactory.random();
    plant1.markAsDeleted();
    const plant2 = PlantFactory.random();
    repository.addToStorage(plant1);
    repository.addToStorage(plant2);

    await listPlants.execute(ADMIN);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('should call repository with active status filter for non-admin users', async () => {
    const plant1 = PlantFactory.random();
    plant1.markAsDeleted();
    const plant2 = PlantFactory.random();
    repository.addToStorage(plant1);
    repository.addToStorage(plant2);

    await listPlants.execute(USER);

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        status: PlantStatus.ACTIVE
      }
    });
  });
});
