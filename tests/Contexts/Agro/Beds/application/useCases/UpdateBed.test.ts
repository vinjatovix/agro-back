import { UpdateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import { bedDomainMapper } from '../../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('UpdateBed', () => {
  const CURRENT_VERSION = 0;
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
    useCase = new UpdateBed({ bedRepository: repository });
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
        USER,
        [CURRENT_VERSION]
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('should confirm a no-op against storage when input has only id', async () => {
    const result = await useCase.execute({ id: bed.id }, USER, [
      CURRENT_VERSION
    ]);

    repository.assertUpdateCalledTimes(1);
    expect(result.version).toBe(bed.version);
    expect(result.metadata).toEqual(bed.metadata);
  });

  it('should return the edited bed even if it is deleted right after the write', async () => {
    jest
      .spyOn(repository, 'findOwnedActiveById')
      .mockResolvedValueOnce(
        bedDomainMapper.fromPrimitives(bedDomainMapper.toPrimitives(bed))
      )
      .mockResolvedValueOnce(null);

    const result = await useCase.execute(
      {
        id: bed.id,
        width: bed.width.value + 50,
        height: bed.height.value + 50
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(result.width.value).toBe(bed.width.value + 50);
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
        otherUser,
        [CURRENT_VERSION]
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
        USER,
        [CURRENT_VERSION]
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
        USER,
        [CURRENT_VERSION]
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
      USER,
      [CURRENT_VERSION]
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
      })
    );
  });

  describe('optimistic concurrency', () => {
    const otherUser: UserSessionInfo = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };
    const resize = (): { id: string; width: number } => ({
      id: bed.id,
      width: bed.width.value + 10
    });
    const storedVersion = (): number | undefined =>
      repository.getStored(bed.id)?.version;

    it('should update and bump the stored version when expectedVersion matches', async () => {
      const updated = await useCase.execute(resize(), USER, [bed.version]);

      expect(updated.width.value).toBe(bed.width.value + 10);
      expect(storedVersion()).toBe(bed.version + 1);
    });

    it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      await expect(
        useCase.execute(resize(), USER, [bed.version + 1])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      repository.assertUpdateNotCalled();
      expect(storedVersion()).toBe(bed.version);
    });

    it('should reject a second writer that read the same version', async () => {
      await useCase.execute(resize(), USER, [bed.version]);

      await expect(
        useCase.execute({ id: bed.id, height: 999 }, USER, [bed.version])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
      expect(repository.getStored(bed.id)?.height.value).toBe(bed.height.value);
    });

    it('should throw DomainNotFoundException (not stale) for an absent bed with a wrong version', async () => {
      await expect(
        useCase.execute({ id: randomBedId(), width: 150 }, USER, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should throw DomainNotFoundException (not stale) for a foreign bed with a wrong version', async () => {
      await expect(
        useCase.execute(resize(), otherUser, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should throw DomainNotFoundException (not stale) for a soft-deleted bed with a wrong version', async () => {
      const deletedBed = BedFactory.create({
        userId: createUserId(USER.id),
        deleted: true,
        deletedAt: new Date()
      });
      repository.addToStorage(deletedBed);

      await expect(
        useCase.execute({ id: deletedBed.id, width: 150 }, USER, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should throw DomainStaleVersionException for a no-op patch with an outdated version', async () => {
      await expect(
        useCase.execute({ id: bed.id, width: bed.width.value }, USER, [
          bed.version + 1
        ])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
    });

    it('should accept a no-op patch with the current version without bumping it', async () => {
      await useCase.execute({ id: bed.id, width: bed.width.value }, USER, [
        bed.version
      ]);

      expect(storedVersion()).toBe(bed.version);
    });

    it('should answer stale for a no-op when the stored version moved after the read', async () => {
      const readCopy = bedDomainMapper.fromPrimitives(
        bedDomainMapper.toPrimitives(bed)
      );
      repository.addToStorage(
        bedDomainMapper.fromPrimitives({
          ...bedDomainMapper.toPrimitives(bed),
          version: bed.version + 1
        })
      );
      jest
        .spyOn(repository, 'findOwnedActiveById')
        .mockResolvedValueOnce(readCopy);

      await expect(
        useCase.execute({ id: bed.id }, USER, [bed.version])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
    });

    it('should answer not found for a no-op when the bed was removed after the read', async () => {
      const readCopy = bedDomainMapper.fromPrimitives(
        bedDomainMapper.toPrimitives(bed)
      );
      repository.clear();
      jest
        .spyOn(repository, 'findOwnedActiveById')
        .mockResolvedValueOnce(readCopy);

      await expect(
        useCase.execute({ id: bed.id, width: bed.width.value }, USER, [
          bed.version
        ])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should read once, write once and never run the existence check on success', async () => {
      await useCase.execute(resize(), USER, [bed.version]);

      repository.assertReadCalledTimes('findOwnedActiveById', 1);
      repository.assertUpdateCalledTimes(1);
      repository.assertExistenceCountCalledTimes(0);
    });
  });

  it('throws InvalidArgumentException and writes nothing when dimension is invalid', async () => {
    const before = bedDomainMapper.toPrimitives(bed);

    await expect(
      useCase.execute({ id: bed.id, width: 0 }, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(InvalidArgumentException);

    repository.assertUpdateNotCalled();
    expect(bedDomainMapper.toPrimitives(repository.getStored(bed.id)!)).toEqual(
      before
    );
  });

  it('should return the updated bed', async () => {
    const updated = await useCase.execute(
      {
        id: bed.id,
        width: bed.width.value + 50,
        height: bed.height.value + 50
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(updated.width.value).toBe(bed.width.value + 50);
    expect(updated.height.value).toBe(bed.height.value + 50);
    expect(updated.metadata).toMatchObject({
      createdBy: USER.username,
      updatedBy: USER.username
    });
  });

  it('should return the in-memory bed with audit data by the acting user and the stored version', async () => {
    const editor: UserSessionInfo = { ...USER, username: 'editor' };
    const stored = BedFactory.create({
      userId: createUserId(USER.id),
      metadata: Metadata.fromPrimitives({
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'creator',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: 'creator'
      })
    });
    repository.addToStorage(stored);

    const updated = await useCase.execute(
      { id: stored.id, name: 'Renamed' },
      editor,
      [stored.version]
    );

    expect(updated.version).toBe(stored.version + 1);
    expect(updated.metadata.updatedBy).toBe('editor');
    expect(updated.metadata.updatedAt.getTime()).toBeGreaterThan(
      stored.metadata.updatedAt.getTime()
    );
    expect(updated.metadata.createdBy).toBe('creator');
    expect(updated.metadata.createdAt).toEqual(stored.metadata.createdAt);
    expect(bedDomainMapper.toPrimitives(updated)).toEqual(
      repository.getStoredPrimitives(stored.id)
    );
    repository.assertReadCalledTimes('findOwnedActiveById', 1);
    repository.assertUpdateCalledTimes(1);
  });

  it('should stamp every change of one request with the same time', async () => {
    const loaded = bedDomainMapper.fromPrimitives(
      bedDomainMapper.toPrimitives(bed)
    );
    jest.spyOn(repository, 'findOwnedActiveById').mockResolvedValueOnce(loaded);
    const rename = jest.spyOn(loaded, 'rename');
    const resize = jest.spyOn(loaded, 'resize');

    const updated = await useCase.execute(
      { id: bed.id, name: 'Renamed', width: bed.width.value + 10 },
      USER,
      [CURRENT_VERSION]
    );

    const at = rename.mock.calls[0]?.[2];
    expect(at).toBeInstanceOf(Date);
    expect(resize.mock.calls[0]?.[2]).toBe(at);
    expect(updated.metadata.updatedAt).toBe(at);
  });

  it('should return no bed when the write fails', async () => {
    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainStaleVersionException(`Bed was modified: ${bed.id}`)
      );

    await expect(
      useCase.execute({ id: bed.id, name: 'Renamed' }, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
  });

  describe('partial updates', () => {
    const storedBed = () => repository.getStored(bed.id);

    it('should rename only, trimming the name, and bump the version', async () => {
      // Act
      const updated = await useCase.execute(
        { id: bed.id, name: '  Raised bed  ' },
        USER,
        [bed.version]
      );

      // Assert
      expect(updated.name.value).toBe('Raised bed');
      expect(updated.width.value).toBe(bed.width.value);
      expect(storedBed()?.version).toBe(bed.version + 1);
    });

    it('should change only the depth', async () => {
      // Act
      const updated = await useCase.execute(
        { id: bed.id, depth: bed.depth.value + 5 },
        USER,
        [bed.version]
      );

      // Assert
      expect(updated.depth.value).toBe(bed.depth.value + 5);
      expect(updated.name.value).toBe(bed.name.value);
      expect(updated.width.value).toBe(bed.width.value);
    });

    it('should neither rename nor resize for an empty update', async () => {
      // Arrange
      const loaded = bedDomainMapper.fromPrimitives(
        bedDomainMapper.toPrimitives(bed)
      );
      jest
        .spyOn(repository, 'findOwnedActiveById')
        .mockResolvedValueOnce(loaded);
      const rename = jest.spyOn(loaded, 'rename');
      const resize = jest.spyOn(loaded, 'resize');

      // Act
      const result = await useCase.execute({ id: bed.id }, USER, [bed.version]);

      // Assert
      expect(rename).not.toHaveBeenCalled();
      expect(resize).not.toHaveBeenCalled();
      repository.assertUpdateCalledTimes(1);
      expect(result.version).toBe(bed.version);
      expect(result.metadata).toEqual(bed.metadata);
    });
  });

  describe('expected version lists', () => {
    it('should proceed when the list contains the current version', async () => {
      // Act
      const updated = await useCase.execute(
        { id: bed.id, name: 'Listed' },
        USER,
        [bed.version + 5, bed.version]
      );

      // Assert
      expect(updated.name.value).toBe('Listed');
    });

    it('should answer stale for an empty list without writing', async () => {
      // Act
      const update = useCase.execute({ id: bed.id, name: 'Listed' }, USER, []);

      // Assert
      await expect(update).rejects.toBeInstanceOf(DomainStaleVersionException);
      repository.assertUpdateNotCalled();
    });

    it('should answer not found before checking an empty list', async () => {
      // Act
      const update = useCase.execute(
        { id: randomBedId(), name: 'Listed' },
        USER,
        []
      );

      // Assert
      await expect(update).rejects.toBeInstanceOf(DomainNotFoundException);
    });
  });
});
