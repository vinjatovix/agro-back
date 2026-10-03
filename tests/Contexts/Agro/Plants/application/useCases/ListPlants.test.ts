import { ListPlants } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/ListPlants.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { PlantReadRepositoryMock } from '../../__mocks__/PlantReadRepositoryMock.js';
import { PlantReadViewMother } from '../queries/PlantReadViewMother.js';

describe('ListPlants', () => {
  let repository: PlantReadRepositoryMock;
  let listPlants: ListPlants;
  const USER = {
    roles: ['user']
  } as UserSessionInfo;
  const ADMIN = {
    roles: ['admin']
  } as UserSessionInfo;
  const COLLABORATOR = {
    roles: ['collaborator']
  } as UserSessionInfo;

  beforeEach(() => {
    repository = new PlantReadRepositoryMock();
    listPlants = new ListPlants({ plantReadRepository: repository });
  });

  it('should call repository with all plants for admin users', async () => {
    repository.addToStorage(PlantReadViewMother.deleted());
    repository.addToStorage(PlantReadViewMother.random());

    await listPlants.execute(ADMIN);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('should call repository with all plants for collaborator users', async () => {
    await listPlants.execute(COLLABORATOR);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('should call repository with active status filter for non-admin users', async () => {
    await listPlants.execute(USER);

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        status: { eq: PlantStatus.ACTIVE }
      }
    });
  });

  it('should keep the user filter and add the active status for anonymous requests', async () => {
    await listPlants.execute(null, {
      query: { filter: { identity: { contains: 'tom' } } }
    });

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        identity: { contains: 'tom' },
        status: { eq: PlantStatus.ACTIVE }
      }
    });
  });

  it('should pass sort and pagination through unchanged', async () => {
    const query = {
      sort: { name: 'desc' as const },
      pagination: { page: 2, limit: 5 }
    };

    await listPlants.execute(ADMIN, { query });

    repository.assertFindAllHasBeenCalledWith({ ...query, filter: {} });
  });

  it('returns stored data as is, without building a Plant', async () => {
    const plant = PlantReadViewMother.breakingABusinessRule();
    repository.addToStorage(plant);

    const result = await listPlants.execute(ADMIN);

    expect(result.data).toEqual([plant]);
    expect(result.data[0]).toBe(plant);
  });
});
