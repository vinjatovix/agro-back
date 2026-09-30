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

  it('should confirm a no-op against storage when input has only id', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const result = await useCase.execute(
      { id: family.idValue },
      'test-user',
      CURRENT_VERSION
    );

    repository.assertUpdateCalledTimes(1);
    expect(result.version).toBe(family.version);
    expect(result.metadata).toEqual(family.metadata);
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

  it('should return the edited family even if it is removed right after the write', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);
    jest
      .spyOn(repository, 'findById')
      .mockResolvedValueOnce(
        familyDomainMapper.fromPrimitives(
          familyDomainMapper.toPrimitives(family)
        )
      )
      .mockResolvedValueOnce(null);

    const result = await useCase.execute(
      { id: family.idValue, name: 'Updated name' },
      'test-user',
      CURRENT_VERSION
    );

    expect(result.name).toBe('Updated name');
  });

  it('should return the in-memory family with audit data by the acting user and the stored version', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const result = await useCase.execute(
      { id: family.idValue, name: 'Renamed' },
      'editor',
      family.version
    );

    expect(result.version).toBe(family.version + 1);
    expect(result.metadata.updatedBy).toBe('editor');
    expect(result.metadata.createdBy).toBe(family.metadata.createdBy);
    expect(result.metadata.createdAt).toEqual(family.metadata.createdAt);
    expect(familyDomainMapper.toPrimitives(result)).toEqual(
      repository.getStoredPrimitives(family.idValue)
    );
  });

  it('should return no family when the write fails', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);
    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainStaleVersionException(`Family was modified: ${family.id}`)
      );

    await expect(
      useCase.execute(
        { id: family.idValue, name: 'Renamed' },
        'test-user',
        family.version
      )
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
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

    it('should answer stale for a no-op when the stored version moved after the read', async () => {
      const family = FamilyScenarios.domainRandom();
      const primitives = familyDomainMapper.toPrimitives(family);
      repository.addToStorage(
        familyDomainMapper.fromPrimitives({
          ...primitives,
          version: family.version + 1
        })
      );
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValueOnce(familyDomainMapper.fromPrimitives(primitives));

      await expect(
        useCase.execute({ id: family.idValue }, 'test-user', family.version)
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
    });

    it('should answer not found for a no-op when the family was removed after the read', async () => {
      const family = FamilyScenarios.domainRandom();
      jest.spyOn(repository, 'findById').mockResolvedValueOnce(family);

      await expect(
        useCase.execute(
          { id: family.idValue, name: family.name },
          'test-user',
          family.version
        )
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should read once, write once and never run the existence check on success', async () => {
      const family = FamilyScenarios.domainRandom();
      repository.addToStorage(family);

      await useCase.execute(
        { id: family.idValue, name: 'Renamed' },
        'test-user',
        family.version
      );

      repository.assertReadCalledTimes('findById', 1);
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
