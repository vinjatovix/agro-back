import { UpdateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
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
    const id = 'non-existing-id';

    await expect(
      useCase.execute(
        {
          id,
          width: 150,
          height: 250
        },
        USER.username
      )
    ).rejects.toThrow(`Bed not found: ${id}`);
  });

  it('should throw error if user is not the creator of the bed', async () => {
    const otherUser: UserSessionInfo = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(
      useCase.execute(
        {
          id: bed.id.value,
          width: 150,
          height: 250
        },
        otherUser.username
      )
    ).rejects.toThrow(
      `User ${otherUser.username} is not allowed to update this bed`
    );
  });

  it('should update bed width and height', async () => {
    await useCase.execute(
      {
        id: bed.id.value,
        width: bed.width.value + 50,
        height: bed.height.value + 50,
        depth: bed.depth.value
      },
      USER.username
    );

    repository.assertUpdateHasBeenCalledWith(
      expect.objectContaining({
        id: bed.id.value,
        width: bed.width.value,
        height: bed.height.value
      }) as BedPrimitives,
      expect.objectContaining({
        id: bed.id.value,
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
        id: bed.id.value,
        width: bed.width.value + 50,
        height: bed.height.value + 50
      },
      USER.username
    );

    expect(updated.width.value).toBe(bed.width.value + 50);
    expect(updated.height.value).toBe(bed.height.value + 50);
    expect(updated.metadata).toMatchObject({
      createdBy: USER.username,
      updatedBy: USER.username
    });
  });
});
