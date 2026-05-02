import { ListPlants } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/ListPlants.js';
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

  it('should return empty list when no plants exist', async () => {
    const result = await listPlants.execute(ADMIN);

    expect(result).toEqual([]);
  });

  it('should return all plants', async () => {
    const plant1 = PlantFactory.random();
    plant1.markAsDeleted();
    const plant2 = PlantFactory.random();
    repository.addToStorage(plant1);
    repository.addToStorage(plant2);

    const result = await listPlants.execute(ADMIN);

    expect(result).toHaveLength(2);
  });

  it('should not return deleted plants for non-admin users', async () => {
    const plant1 = PlantFactory.random();
    plant1.markAsDeleted();
    const plant2 = PlantFactory.random();
    repository.addToStorage(plant1);
    repository.addToStorage(plant2);

    const result = await listPlants.execute(USER);

    expect(result).toHaveLength(1);
    expect(result[0]?.id.value).toBe(plant2.id.value);
  });
});
