import { ListFamilies } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/application/useCases/ListFamilies.js';
import { FamilyRepositoryMock } from '../../__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';
import { type ListFamiliesDto } from '../../../../../../../src/Contexts/Agro/Knowledge/Families/application/useCases/interfaces/ListFamiliesDto.js';

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

  it('should return families with default pagination when no query is provided', async () => {
    const family1 = FamilyScenarios.domainBase();
    const family2 = FamilyScenarios.domainBase();

    repository.addToStorage(family1);
    repository.addToStorage(family2);

    const result = await useCase.execute({});

    expect(result).toHaveLength(2);

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 1, limit: 20 }
    });
  });

  it('should fallback to default pagination when query is empty object', async () => {
    await useCase.execute({ query: {} });

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 1, limit: 20 }
    });
  });

  it('should use provided pagination when present', async () => {
    const family = FamilyScenarios.domainBase();
    repository.addToStorage(family);

    const dto: ListFamiliesDto = {
      query: {
        pagination: { page: 2, limit: 10 }
      }
    };

    await useCase.execute(dto);

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 2, limit: 10 }
    });
  });

  it('should pass full query options to repository', async () => {
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

  it('should fallback to default pagination when query exists but pagination is missing', async () => {
    const dto: ListFamiliesDto = {
      query: {
        filter: { name: { eq: 'Asteraceae' } }
      }
    };

    await useCase.execute(dto);

    repository.assertFindAllHasBeenCalledWith({
      filter: { name: { eq: 'Asteraceae' } },
      pagination: { page: 1, limit: 20 }
    });
  });
});
