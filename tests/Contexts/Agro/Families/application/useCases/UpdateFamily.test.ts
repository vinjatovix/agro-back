import { UpdateFamily } from '../../../../../../src/Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import { familyDomainMapper } from '../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('UpdateFamily', () => {
  const CURRENT_VERSION = 0;
  let repository: FamilyRepositoryMock;
  let useCase: UpdateFamily;

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new UpdateFamily(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should call updateWithDiff with two complete FamilyPrimitives states', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);
    const before = familyDomainMapper.toPrimitives(family);

    await useCase.execute(
      { id: family.idValue, name: 'New name', slug: 'new-slug' },
      'test-user',
      CURRENT_VERSION
    );

    const [calledBefore, calledAfter] = repository.getLastUpdateArgs();
    expect(calledBefore).toEqual(before);
    expect(calledAfter).toMatchObject({
      id: family.idValue,
      name: 'New name',
      slug: 'new-slug',
      scientificName: before.scientificName,
      shortDescription: before.shortDescription,
      aliases: before.aliases,
      highlights: before.highlights
    });
    expect(calledAfter.metadata.createdBy).toBe(before.metadata.createdBy);
  });

  it('should remove extra from stored family when extra is null', async () => {
    const family = FamilyScenarios.domainBaseWithExtra();
    repository.addToStorage(family);
    expect(familyDomainMapper.toPrimitives(family).extra).toBeDefined();

    await useCase.execute(
      { id: family.idValue, extra: null },
      'test-user',
      CURRENT_VERSION
    );

    const stored = repository.getStored(family.idValue);
    expect(stored?.extra).toBeUndefined();
  });

  it('should reject an empty name and leave family unchanged', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    await expect(
      useCase.execute(
        { id: family.idValue, name: '' },
        'test-user',
        CURRENT_VERSION
      )
    ).rejects.toThrow(InvalidArgumentException);

    expect(repository.getStored(family.idValue)?.version).toBe(family.version);
    expect(repository.getStored(family.idValue)?.name).toBe(family.name);
  });

  it('should perform no write when input has only id', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const result = await useCase.execute(
      { id: family.idValue },
      'test-user',
      CURRENT_VERSION
    );

    repository.assertUpdateNotCalled();
    expect(result.version).toBe(family.version);
  });

  it('should call repository.findById with correct id', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    await useCase.execute(
      {
        id: family.idValue,
        name: 'Updated name'
      },
      'test-user',
      CURRENT_VERSION
    );

    repository.assertFindByIdHasBeenCalledWith(family.idValue);
  });

  it('should throw not found error when family does not exist', async () => {
    const patch = { id: random.uuid(), name: 'whatever' };

    await expect(
      useCase.execute(patch, 'test-user', CURRENT_VERSION)
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should report the missing family id in the not found message', async () => {
    const patch = { id: random.uuid(), name: 'whatever' };
    const expectedMessage = `Family not found: ${patch.id}`;

    await expect(
      useCase.execute(patch, 'test-user', CURRENT_VERSION)
    ).rejects.toMatchObject({
      message: expectedMessage
    });
  });

  it('should not call updateWithDiff when family does not exist', async () => {
    const patch = { id: random.uuid(), name: 'whatever' };

    await expect(
      useCase.execute(patch, 'test-user', CURRENT_VERSION)
    ).rejects.toBeInstanceOf(DomainNotFoundException);

    repository.assertUpdateNotCalled();
  });

  it('should throw not found error when the post-write re-read returns null', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);
    jest
      .spyOn(repository, 'findById')
      .mockResolvedValueOnce(family)
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute(
        { id: family.idValue, name: 'Updated name' },
        'test-user',
        CURRENT_VERSION
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  describe('optimistic concurrency', () => {
    it('should update and bump the stored version when expectedVersion matches', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      const result = await useCase.execute(
        { id: family.idValue, name: 'Renamed' },
        'test-user',
        family.version
      );

      expect(result.name).toBe('Renamed');
      expect(repository.getStored(family.idValue)?.version).toBe(
        family.version + 1
      );
    });

    it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      await expect(
        useCase.execute(
          { id: family.idValue, name: 'Renamed' },
          'test-user',
          family.version + 1
        )
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      repository.assertUpdateNotCalled();
      expect(repository.getStored(family.idValue)?.name).toBe(family.name);
    });

    it('should throw DomainNotFoundException (not stale) for an absent family with a wrong version', async () => {
      await expect(
        useCase.execute(
          { id: random.uuid(), name: 'Renamed' },
          'test-user',
          999
        )
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should throw DomainStaleVersionException for a no-op patch with an outdated version', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      await expect(
        useCase.execute(
          { id: family.idValue, name: family.name },
          'test-user',
          family.version + 1
        )
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
    });

    it('should accept a no-op patch with the current version without bumping it', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      await useCase.execute(
        { id: family.idValue, name: family.name },
        'test-user',
        family.version
      );

      expect(repository.getStored(family.idValue)?.version).toBe(
        family.version
      );
    });

    it('should read twice, write once and never run the existence check on success', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      await useCase.execute(
        { id: family.idValue, name: 'Renamed' },
        'test-user',
        family.version
      );

      repository.assertReadCalledTimes('findById', 2);
      repository.assertUpdateCalledTimes(1);
      repository.assertExistenceCountCalledTimes(0);
    });
  });

  it('should return updated family', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const result = await useCase.execute(
      {
        id: family.idValue,
        name: 'final-name'
      },
      'test-user',
      CURRENT_VERSION
    );

    expect(result.idValue).toBe(family.idValue);
    expect(result.name).toBe('final-name');
  });
});
