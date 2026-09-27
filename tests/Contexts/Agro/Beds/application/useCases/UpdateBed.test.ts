import { UpdateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('UpdateBed', () => {
  let repository: BedRepositoryMock;
  let useCase: UpdateBed;
  const USER: UserSessionInfo = {
    username: 'test-user',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };
  const bed = BedFactory.fromUser(USER);

  beforeEach(() => {
    repository = new BedRepositoryMock();
    repository.addToStorage(bed);
    useCase = new UpdateBed(repository);
  });

  it('should throw not found error if bed does not exist', async () => {
    const id = randomBedId();

    await expect(
      useCase.execute(
        {
          id,
          width: 150,
          height: 250
        },
        USER
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('should throw not found error if the bed disappears after the update', async () => {
    jest
      .spyOn(repository, 'findOwnedActiveById')
      .mockResolvedValueOnce(bed)
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute(
        {
          id: bed.id,
          width: bed.width.value + 50,
          height: bed.height.value + 50
        },
        USER
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should throw not found error if user is not the creator of the bed', async () => {
    const otherUser: UserSessionInfo = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(
      useCase.execute(
        {
          id: bed.id,
          width: 150,
          height: 250
        },
        otherUser
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('should throw not found error if bed is soft-deleted', async () => {
    const deletedBed = BedFactory.create({
      userId: createUserId(USER.id),
      deleted: true,
      deletedAt: new Date()
    });
    repository.addToStorage(deletedBed);

    await expect(
      useCase.execute(
        {
          id: deletedBed.id,
          width: 150,
          height: 250
        },
        USER
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('should throw not found error if updateWithDiff rejects with DomainNotFoundException (concurrent delete)', async () => {
    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainNotFoundException(`Bed not found: ${bed.id}`)
      );

    await expect(
      useCase.execute(
        {
          id: bed.id,
          width: bed.width.value + 50,
          height: bed.height.value + 50
        },
        USER
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should throw not found error when re-read finds soft-deleted bed after update (FR-007a)', async () => {
    const deletedBed = BedFactory.create({
      id: bed.id,
      userId: createUserId(USER.id),
      deleted: true,
      deletedAt: new Date()
    });
    jest.spyOn(repository, 'updateWithDiff').mockImplementationOnce(() => {
      repository.addToStorage(deletedBed);
      return Promise.resolve();
    });

    await expect(
      useCase.execute(
        {
          id: bed.id,
          width: bed.width.value + 50,
          height: bed.height.value + 50
        },
        USER
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should update bed width and height', async () => {
    await useCase.execute(
      {
        id: bed.id,
        width: bed.width.value + 50,
        height: bed.height.value + 50,
        depth: bed.depth.value
      },
      USER
    );

    repository.assertUpdateHasBeenCalledWith(
      expect.objectContaining({
        id: bed.id,
        width: bed.width.value,
        height: bed.height.value
      }) as BedPrimitives,
      expect.objectContaining({
        id: bed.id,
        width: bed.width.value + 50,
        height: bed.height.value + 50,
        depth: bed.depth.value
      }),
      USER.username
    );
  });

  it('should return the updated bed', async () => {
    const updated = await useCase.execute(
      {
        id: bed.id,
        width: bed.width.value + 50,
        height: bed.height.value + 50
      },
      USER
    );

    expect(updated.width.value).toBe(bed.width.value + 50);
    expect(updated.height.value).toBe(bed.height.value + 50);
    expect(updated.metadata).toMatchObject({
      createdBy: USER.username,
      updatedBy: USER.username
    });
  });
});
