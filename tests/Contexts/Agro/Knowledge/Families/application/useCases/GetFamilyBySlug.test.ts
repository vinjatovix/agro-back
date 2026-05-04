import { GetFamilyBySlug } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/application/useCases/GetFamilyBySlug.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('GetFamilyBySlug', () => {
  let repository: FamilyRepositoryMock;
  let useCase: GetFamilyBySlug;

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new GetFamilyBySlug(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should return a family when it exists', async () => {
    const family = FamilyScenarios.domainBase();

    repository.addToStorage(family);

    const result = await useCase.execute(family.slug);

    expect(result).toBe(family);
    repository.assertFindBySlugHasBeenCalledWith(family.slug);
  });

  it('should throw not found error when family does not exist', async () => {
    const slug = random.word();

    await expect(useCase.execute(slug)).rejects.toThrow(
      `Family not found: ${slug}`
    );

    repository.assertFindBySlugHasBeenCalledWith(slug);
  });
});
