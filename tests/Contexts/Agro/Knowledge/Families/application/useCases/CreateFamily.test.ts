import { CreateFamily } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/application/useCases/CreateFamily.js';
import { createError } from '../../../../../../../src/shared/errors/index.js';
import { UuidMother } from '../../../../../shared/fixtures/UuidMother.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('CreateFamily', () => {
  let repository: FamilyRepositoryMock;
  let useCase: CreateFamily;
  const USER = 'test-user';

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new CreateFamily(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should create a family successfully', async () => {
    const dto = FamilyScenarios.createDtoBase();

    const result = await useCase.execute(dto, USER);

    expect(result.idValue).toBe(dto.id);
    expect(result.slug).toBe(dto.slug);
    expect(result.name).toBe(dto.name);
    expect(result.aliases).toEqual(dto.aliases);
    expect(result.scientificName).toBe(dto.scientificName);
    expect(result.shortDescription).toBe(dto.shortDescription);
    expect(result.highlights).toEqual(dto.highlights);
    repository.assertExistsCalledWith(dto.id);
    repository.assertSaveHasBeenCalledWith(result);
  });

  it('should throw conflict error if family already exists', async () => {
    const id = UuidMother.random();
    const family = FamilyScenarios.domainRandom({ id });
    repository.addToStorage(family);
    const dto = FamilyScenarios.createDtoBase({ id: id.value });

    await expect(useCase.execute(dto, USER)).rejects.toThrow(
      createError.conflict(`Family already exists: ${dto.id}`)
    );
    repository.assertSaveNotCalled();
  });
});
