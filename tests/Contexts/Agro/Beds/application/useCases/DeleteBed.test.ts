import { DeleteBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('DeleteBed', () => {
  const CURRENT_VERSION = 0;
  let bedRepository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let useCase: DeleteBed;
  const USER: UserSessionInfo = {
    username: 'test-user',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    useCase = new DeleteBed({
      bedRepository,
      plantInstanceRepository
    });
  });

  it('should mark bed as deleted via updateWithDiff and cascade crop removal', async () => {
    const bed = BedFactory.fromUser(USER);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(USER.id),
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    await useCase.execute(bed.id, USER, [CURRENT_VERSION]);

    expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
    expect(plantInstanceRepository.getStored(crop.id)?.instanceStatus).toBe(
      'removed'
    );
    bedRepository.assertUpdateCalled();
    bedRepository.assertSaveNotCalled();
  });

  it('should store the deleting user and time as audit data with one read and one write', async () => {
    const bed = BedFactory.fromUser(USER);
    bedRepository.addToStorage(bed);
    const deleter: UserSessionInfo = { ...USER, username: 'deleter' };

    await useCase.execute(bed.id, deleter, [bed.version]);

    const stored = bedRepository.getStoredPrimitives(bed.id);
    expect(stored?.metadata.updatedBy).toBe('deleter');
    expect(stored?.metadata.updatedAt.toISOString()).toBe(stored?.deletedAt);
    expect(stored?.metadata.createdBy).toBe(bed.metadata.createdBy);
    expect(stored?.version).toBe(bed.version + 1);
    bedRepository.assertReadCalledTimes('findOwnedActiveById', 1);
    bedRepository.assertUpdateCalledTimes(1);
  });

  it('should throw not found error if bed already deleted (repeat delete)', async () => {
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(USER.id)
    });

    bedRepository.addToStorage(bed);

    await expect(
      useCase.execute(bed.id, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
    bedRepository.assertSaveNotCalled();
  });

  it('should throw if bed does not exist', async () => {
    const nonExistentId = random.uuid();

    await expect(
      useCase.execute(nonExistentId, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertSaveNotCalled();
    bedRepository.assertUpdateNotCalled();
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

    bedRepository.addToStorage(bed);

    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(
      useCase.execute(bed.id, otherUser, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  describe('optimistic concurrency', () => {
    it('should soft-delete via updateWithDiff when expectedVersion matches', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
      expect(bedRepository.getStored(bed.id)?.version).toBe(bed.version + 1);
    });

    it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, [bed.version + 1])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      bedRepository.assertUpdateNotCalled();
      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(false);
    });

    it('should throw DomainNotFoundException (not stale) for an absent bed with a wrong version', async () => {
      await expect(
        useCase.execute(random.uuid(), USER, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should read once, write once and never run the existence check on success', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      bedRepository.assertReadCalledTimes('findOwnedActiveById', 1);
      bedRepository.assertUpdateCalledTimes(1);
      bedRepository.assertExistenceCountCalledTimes(0);
    });
  });

  describe('expected version lists', () => {
    it('should proceed when the list contains the current version', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version + 1, bed.version]);

      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
    });

    it('should answer stale for an empty list without writing', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      const remove = useCase.execute(bed.id, USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainStaleVersionException);
      bedRepository.assertUpdateNotCalled();
    });

    it('should answer not found before checking an empty list', async () => {
      const remove = useCase.execute(random.uuid(), USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainNotFoundException);
    });
  });
});
