import { GetFamilyById } from '../../../../../../src/Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

describe('GetFamilyById', () => {
  let repository: FamilyReadRepositoryMock;
  let useCase: GetFamilyById;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    useCase = new GetFamilyById({ familyReadRepository: repository });
  });

  it('should return a family when it exists', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await expect(useCase.execute(family.id)).resolves.toEqual(family);

    repository.assertFindByIdHasBeenCalledWith(family.id);
  });

  it('should throw not found error when family does not exist', async () => {
    const id = random.uuid();

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindByIdHasBeenCalledWith(id);
  });

  it('should forward the fieldset to the repository', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const options = { fields: ['name', 'slug'] as const };

    await expect(useCase.execute(family.id, options)).resolves.toEqual({
      id: family.id,
      name: family.name,
      slug: family.slug
    });

    repository.assertFindByIdHasBeenCalledWith(family.id, options);
  });

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    await expect(useCase.execute(family.id)).resolves.toBe(family);
  });
});
