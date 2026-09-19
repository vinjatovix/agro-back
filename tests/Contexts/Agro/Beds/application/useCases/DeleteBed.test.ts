import { DeleteBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('DeleteBed', () => {
  let repository: BedRepositoryMock;
  let useCase: DeleteBed;
  const USER: UserSessionInfo = {
    username: 'test-user',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };
  beforeEach(() => {
    repository = new BedRepositoryMock();
    useCase = new DeleteBed(repository);
  });

  it('should mark bed as deleted', async () => {
    const bed = BedFactory.fromUser(USER);

    repository.addToStorage(bed);

    await useCase.execute(bed.id.value, USER);

    expect(bed.isDeleted).toBe(true);
    repository.assertSaveHasBeenCalledWith(bed);
  });

  it('should not fail if bed already deleted', async () => {
    const bed = BedFactory.fromUser(USER);
    bed.markAsDeleted();

    repository.addToStorage(bed);

    await useCase.execute(bed.id.value, USER);

    repository.assertSaveNotCalled();
  });

  it('should throw if bed does not exist', async () => {
    const nonExistentId = random.uuid();

    await expect(useCase.execute(nonExistentId, USER)).rejects.toThrow(
      `Bed not found: ${nonExistentId}`
    );
  });

  it('should throw if user is not the creator of the bed', async () => {
    const bed = BedFactory.fromUser(USER);

    repository.addToStorage(bed);

    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(useCase.execute(bed.id.value, otherUser)).rejects.toThrow(
      `User ${otherUser.username} does not have permission to delete this bed`
    );
  });

  it('should throw if bed has plants', async () => {
    const withPlants = true;
    const bed = BedFactory.fromUser(USER, withPlants);

    repository.addToStorage(bed);

    await expect(useCase.execute(bed.id.value, USER)).rejects.toThrow(
      'Cannot delete bed with plants. Remove plants or transplant them first.'
    );
  });
});
