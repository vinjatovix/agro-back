import { DeleteBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('DeleteBed', () => {
  const CURRENT_VERSION = 0;
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
    useCase = new DeleteBed({ bedRepository: repository });
  });

  it('should mark bed as deleted via updateWithDiff', async () => {
    const bed = BedFactory.fromUser(USER);

    repository.addToStorage(bed);

    await useCase.execute(bed.id, USER, [CURRENT_VERSION]);

    expect(repository.getStored(bed.id)?.isDeleted).toBe(true);
    repository.assertUpdateCalled();
    repository.assertSaveNotCalled();
  });

  it('should store the deleting user and time as audit data with one read and one write', async () => {
    const bed = BedFactory.fromUser(USER);
    repository.addToStorage(bed);
    const deleter: UserSessionInfo = { ...USER, username: 'deleter' };

    await useCase.execute(bed.id, deleter, [bed.version]);

    const stored = repository.getStoredPrimitives(bed.id);
    expect(stored?.metadata.updatedBy).toBe('deleter');
    expect(stored?.metadata.updatedAt.toISOString()).toBe(stored?.deletedAt);
    expect(stored?.metadata.createdBy).toBe(bed.metadata.createdBy);
    expect(stored?.version).toBe(bed.version + 1);
    repository.assertReadCalledTimes('findOwnedActiveById', 1);
    repository.assertUpdateCalledTimes(1);
  });

  it('should throw not found error if bed already deleted (repeat delete)', async () => {
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(USER.id)
    });

    repository.addToStorage(bed);

    await expect(
      useCase.execute(bed.id, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
    repository.assertSaveNotCalled();
  });

  it('should throw if bed does not exist', async () => {
    const nonExistentId = random.uuid();

    await expect(
      useCase.execute(nonExistentId, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertSaveNotCalled();
    repository.assertUpdateNotCalled();
  });

  it('should report the missing bed id in the not found message', async () => {
    const nonExistentId = random.uuid();
    const expectedMessage = `Bed not found: ${nonExistentId}`;

    await expect(
      useCase.execute(nonExistentId, USER, [CURRENT_VERSION])
    ).rejects.toMatchObject({
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

    await expect(
      useCase.execute(bed.id, otherUser, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
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

    await expect(
      useCase.execute(bed.id, otherUser, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  describe('optimistic concurrency', () => {
    it('should soft-delete via updateWithDiff when expectedVersion matches', async () => {
      const bed = BedFactory.fromUser(USER);
      repository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      expect(repository.getStored(bed.id)?.isDeleted).toBe(true);
      expect(repository.getStored(bed.id)?.version).toBe(bed.version + 1);
    });

    it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      const bed = BedFactory.fromUser(USER);
      repository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, [bed.version + 1])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      repository.assertUpdateNotCalled();
      expect(repository.getStored(bed.id)?.isDeleted).toBe(false);
    });

    it('should report a stale version before the bed-has-plants conflict', async () => {
      const bed = BedFactory.fromUser(USER, true);
      repository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, [bed.version + 1])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
      repository.assertUpdateNotCalled();
    });

    it('should report the bed-has-plants conflict when the version is current', async () => {
      const bed = BedFactory.fromUser(USER, true);
      repository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, [bed.version])
      ).rejects.toBeInstanceOf(DomainConflictException);
    });

    it('should throw DomainNotFoundException (not stale) for an absent bed with a wrong version', async () => {
      await expect(
        useCase.execute(random.uuid(), USER, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should read once, write once and never run the existence check on success', async () => {
      const bed = BedFactory.fromUser(USER);
      repository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      repository.assertReadCalledTimes('findOwnedActiveById', 1);
      repository.assertUpdateCalledTimes(1);
      repository.assertExistenceCountCalledTimes(0);
    });
  });

  it('should throw conflict error if own bed has plants', async () => {
    const withPlants = true;
    const bed = BedFactory.fromUser(USER, withPlants);

    repository.addToStorage(bed);

    await expect(
      useCase.execute(bed.id, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainConflictException);
    repository.assertUpdateNotCalled();
  });

  describe('expected version lists', () => {
    it('should proceed when the list contains the current version', async () => {
      const bed = BedFactory.fromUser(USER);
      repository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version + 1, bed.version]);

      expect(repository.getStored(bed.id)?.isDeleted).toBe(true);
    });

    it('should answer stale for an empty list without writing', async () => {
      const bed = BedFactory.fromUser(USER);
      repository.addToStorage(bed);

      const remove = useCase.execute(bed.id, USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainStaleVersionException);
      repository.assertUpdateNotCalled();
    });

    it('should answer not found before checking an empty list', async () => {
      const remove = useCase.execute(random.uuid(), USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainNotFoundException);
    });
  });
});
