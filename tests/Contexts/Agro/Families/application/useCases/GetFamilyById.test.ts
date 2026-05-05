import { GetFamilyById } from '../../../../../../src/Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('GetFamilyById', () => {
  let repository: FamilyRepositoryMock;
  let useCase: GetFamilyById;

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new GetFamilyById(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should return a family when it exists', async () => {
    const family = FamilyScenarios.domainBase();

    repository.addToStorage(family);

    const result = await useCase.execute(family.idValue);

    expect(result).toBe(family);
    repository.assertFindByIdHasBeenCalledWith(family.idValue);
  });

  it('should throw not found error when family does not exist', async () => {
    const id = random.uuid();

    await expect(useCase.execute(id)).rejects.toThrow(
      `Family not found: ${id}`
    );

    repository.assertFindByIdHasBeenCalledWith(id);
  });
});
