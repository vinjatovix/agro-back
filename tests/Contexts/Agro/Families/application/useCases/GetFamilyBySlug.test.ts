import { GetFamilyBySlug } from '../../../../../../src/Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

describe('GetFamilyBySlug', () => {
  let repository: FamilyReadRepositoryMock;
  let useCase: GetFamilyBySlug;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    useCase = new GetFamilyBySlug({ familyReadRepository: repository });
  });

  it('should return a family when it exists', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await expect(useCase.execute(family.slug)).resolves.toEqual(family);

    repository.assertFindBySlugHasBeenCalledWith(family.slug);
  });

  it('should throw not found error when family does not exist', async () => {
    const slug = random.word();

    await expect(useCase.execute(slug)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindBySlugHasBeenCalledWith(slug);
  });

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    await expect(useCase.execute(family.slug)).resolves.toBe(family);
  });
});
