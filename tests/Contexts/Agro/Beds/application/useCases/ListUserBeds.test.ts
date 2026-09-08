import { ListUserBeds } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';

describe('ListUserBeds', () => {
  let repository: BedRepositoryMock;
  let useCase: ListUserBeds;

  beforeEach(() => {
    repository = new BedRepositoryMock();
    useCase = new ListUserBeds(repository);
  });

  it('should call repository.findByUser with correct userId', async () => {
    const userId = random.uuid();
    const spy = jest.spyOn(repository, 'findByUserId');

    await useCase.execute(userId);

    expect(spy).toHaveBeenCalledWith(userId);
  });
});
