import type { ListFamiliesDto } from '../../../../../../src/Contexts/Agro/Families/application/useCases/interfaces/ListFamiliesDto.js';
import { ListFamilies } from '../../../../../../src/Contexts/Agro/Families/application/useCases/ListFamilies.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

describe('ListFamilies', () => {
  let repository: FamilyRepositoryMock;
  let useCase: ListFamilies;

  beforeEach(() => {
    repository = new FamilyRepositoryMock();
    useCase = new ListFamilies(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  it('should return families from repository', async () => {
    const family1 = FamilyScenarios.domainBase();
    const family2 = FamilyScenarios.domainBase();

    repository.addToStorage(family1);
    repository.addToStorage(family2);

    const { data } = await useCase.execute();

    expect(data).toHaveLength(2);
  });

  it('should call repository findAll', async () => {
    await useCase.execute();

    repository.assertFindAllCalled();
  });

  it('should forward query options to repository', async () => {
    const dto: ListFamiliesDto = {
      query: {
        filter: { name: { eq: 'Rosaceae' } },
        sort: { name: 'asc' },
        pagination: { page: 1, limit: 5 },
        include: ['plants']
      }
    };

    await useCase.execute(dto);

    repository.assertFindAllHasBeenCalledWith(dto.query);
  });
});
