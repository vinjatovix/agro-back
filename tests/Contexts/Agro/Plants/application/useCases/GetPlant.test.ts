import { GetPlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/GetPlant.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilySummaryReaderMock } from '../../__mocks__/FamilySummaryReaderMock.js';
import { PlantReadRepositoryMock } from '../../__mocks__/PlantReadRepositoryMock.js';
import { FamilySummaryViewMother } from '../queries/FamilySummaryViewMother.js';
import { PlantReadViewMother } from '../queries/PlantReadViewMother.js';

describe('GetPlant', () => {
  let repository: PlantReadRepositoryMock;
  let familySummaryReader: FamilySummaryReaderMock;
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
    repository = new PlantReadRepositoryMock();
    familySummaryReader = new FamilySummaryReaderMock();
    getPlant = new GetPlant({
      plantReadRepository: repository,
      familySummaryReader
    });
  });

  it('should search only active plants for regular users', async () => {
    const plant = PlantReadViewMother.tomato();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).resolves.toEqual(plant);

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
    repository.assertFindByIdNotCalled();
  });

  it('should throw error when plant does not exist', async () => {
    const id = random.uuid();
    await expect(getPlant.execute(id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(id);
  });

  it('should throw error if plant is deleted and user tries to access it', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should only look up active plants for anonymous requests', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should return plant if it is deleted but user has admin role', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, ADMIN)).resolves.toEqual(plant);

    repository.assertFindByIdHasBeenCalledWith(plant.id);
    repository.assertFindActiveByIdNotCalled();
  });

  it('should return plant if it is deleted but user has collaborator role', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, COLLABORATOR)).resolves.toEqual(
      plant
    );

    repository.assertFindByIdHasBeenCalledWith(plant.id);
  });

  it('returns stored data as is, without building a Plant', async () => {
    const plant = PlantReadViewMother.breakingABusinessRule();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).resolves.toBe(plant);
  });

  describe('with a fieldset', () => {
    it('should forward the fieldset to the repository', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, USER, { fields: ['identity'] })
      ).resolves.toEqual({ id: plant.id, identity: plant.identity });

      repository.assertFindActiveByIdHasBeenCalledWith(plant.id, {
        fields: ['identity']
      });
    });

    it('should still hide a deleted plant from regular users', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, USER, { fields: ['identity'] })
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should show a deleted plant to admins', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, ADMIN, { fields: ['status'] })
      ).resolves.toEqual({ id: plant.id, status: 'DELETED' });
    });
  });

  describe('including the family', () => {
    it('should embed the family summary with one read', async () => {
      const family = FamilySummaryViewMother.random();
      familySummaryReader.add(family);
      const plant = PlantReadViewMother.ofFamily(family.id);
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family']
      });

      expect(result.identity?.family).toEqual(family);
      familySummaryReader.assertCalledOnceWith([family.id]);
      repository.assertFindActiveByIdHasBeenCalledWith(plant.id, {});
    });

    it('should keep the plain id when the family is not found', async () => {
      const plant = PlantReadViewMother.ofFamily(random.uuid());
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family']
      });

      expect(result).toEqual(plant);
    });

    it('should not read families without include', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, USER);

      familySummaryReader.assertNotCalled();
    });

    it('should not read families when the fieldset leaves out identity', async () => {
      const family = FamilySummaryViewMother.random();
      familySummaryReader.add(family);
      const plant = PlantReadViewMother.ofFamily(family.id);
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family'],
        fields: ['traits']
      });

      expect(result).toEqual({ id: plant.id, traits: plant.traits });
      familySummaryReader.assertNotCalled();
    });
  });
});
