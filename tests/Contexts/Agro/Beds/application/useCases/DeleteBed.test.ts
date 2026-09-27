import { DeleteBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  DomainConflictException,
  DomainNotFoundException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
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

  it('should mark bed as deleted via updateWithDiff', async () => {
    const bed = BedFactory.fromUser(USER);

    repository.addToStorage(bed);

    await useCase.execute(bed.id, USER);

    expect(bed.isDeleted).toBe(true);
    repository.assertUpdateCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw not found error if bed already deleted (repeat delete)', async () => {
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(USER.id)
    });

    repository.addToStorage(bed);

    await expect(useCase.execute(bed.id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
    repository.assertUpdateNotCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw if bed does not exist', async () => {
    const nonExistentId = random.uuid();

    await expect(useCase.execute(nonExistentId, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
    repository.assertSaveNotCalled();
    repository.assertUpdateNotCalled();
  });

  it('should report the missing bed id in the not found message', async () => {
    const nonExistentId = random.uuid();
    const expectedMessage = `Bed not found: ${nonExistentId}`;

    await expect(useCase.execute(nonExistentId, USER)).rejects.toMatchObject({
      message: expectedMessage
    });
  });

  it('should throw not found error if user is not the creator of the bed (foreign bed)', async () => {
    const bed = BedFactory.fromUser(USER);

    repository.addToStorage(bed);

    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(useCase.execute(bed.id, otherUser)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
    repository.assertUpdateNotCalled();
  });

  it('should throw not found (never conflict) if foreign bed has plants', async () => {
    const withPlants = true;
    const bed = BedFactory.fromUser(USER, withPlants);

    repository.addToStorage(bed);

    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(useCase.execute(bed.id, otherUser)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
    repository.assertUpdateNotCalled();
  });

  it('should throw conflict error if own bed has plants', async () => {
    const withPlants = true;
    const bed = BedFactory.fromUser(USER, withPlants);

    repository.addToStorage(bed);

    await expect(useCase.execute(bed.id, USER)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    repository.assertUpdateNotCalled();
  });
});
