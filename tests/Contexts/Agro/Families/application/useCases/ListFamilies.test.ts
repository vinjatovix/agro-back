import type { ListFamiliesDto } from '../../../../../../src/Contexts/Agro/Families/application/useCases/interfaces/ListFamiliesDto.js';
import { ListFamilies } from '../../../../../../src/Contexts/Agro/Families/application/useCases/ListFamilies.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

describe('ListFamilies', () => {
  let repository: FamilyReadRepositoryMock;
  let useCase: ListFamilies;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    useCase = new ListFamilies({ familyReadRepository: repository });
  });

  it('should return families from repository', async () => {
    repository.addToStorage(FamilyReadViewMother.random());
    repository.addToStorage(FamilyReadViewMother.random());

    const { data } = await useCase.execute();

    expect(data).toHaveLength(2);
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

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    const { data } = await useCase.execute();

    expect(data[0]).toBe(family);
  });
});
