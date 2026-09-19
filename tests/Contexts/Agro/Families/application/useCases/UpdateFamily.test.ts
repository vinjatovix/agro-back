import { UpdateFamily } from '../../../../../../src/Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import { familyDomainMapper } from '../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('UpdateFamily', () => {
  let repository: FamilyRepositoryMock;
  let useCase: UpdateFamily;

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new UpdateFamily(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should call updateWithDiff with correct arguments', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const updateDto = {
      name: 'New name',
      slug: 'new-slug',
      scientificName: 'New scientific name',
      shortDescription: 'New short description',
      highlights: ['h1', 'h2'],
      aliases: ['a1', 'a2']
    };

    await useCase.execute(
      {
        id: family.idValue,
        ...updateDto
      },
      'test-user'
    );

    repository.assertUpdateHasBeenCalledWith(
      familyDomainMapper.toPrimitives(family),
      expect.objectContaining({
        name: updateDto.name,
        slug: updateDto.slug,
        scientificName: updateDto.scientificName,
        shortDescription: updateDto.shortDescription,
        highlights: updateDto.highlights,
        aliases: updateDto.aliases
      }),
      'test-user'
    );
  });

  it('should call repository.findById with correct id', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    await useCase.execute(
      {
        id: family.idValue,
        name: 'Updated name'
      },
      'test-user'
    );

    repository.assertFindByIdHasBeenCalledWith(family.idValue);
  });

  it('should throw not found error when family does not exist', async () => {
    await expect(
      useCase.execute(
        {
          id: 'non-existing-id',
          name: 'whatever'
        },
        'test-user'
      )
    ).rejects.toThrow('Family not found: non-existing-id');
  });

  it('should not call updateWithDiff when family does not exist', async () => {
    await expect(
      useCase.execute(
        {
          id: 'non-existing-id',
          name: 'whatever'
        },
        'test-user'
      )
    ).rejects.toThrow();

    repository.assertUpdateNotCalled();
  });

  it('should return updated family', async () => {
    const family = FamilyScenarios.domainRandom();
    repository.addToStorage(family);

    const result = await useCase.execute(
      {
        id: family.idValue,
        name: 'final-name'
      },
      'test-user'
    );

    expect(result.idValue).toBe(family.idValue);
    expect(result.name).toBe('final-name');
  });
});
