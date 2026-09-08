import { GetBedById } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('GetBedById', () => {
  let repository: BedRepositoryMock;
  let useCase: GetBedById;

  beforeEach(() => {
    repository = new BedRepositoryMock();
    useCase = new GetBedById(repository);
  });

  it('should call repository.findById with correct id', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: bed.userId.value,
      email: 'test-user@example.com',
      roles: ['user']
    };

    await useCase.execute(bed.id.value, user);

    repository.assertFindByIdHasBeenCalledWith(bed.id.value);
  });

  it('should throw not found error when bed does not exist', async () => {
    const id = random.uuid();
    const user = {
      username: 'test-user',
      id: random.uuid(),
      email: 'test-user@example.com',
      roles: ['user']
    };

    await expect(useCase.execute(id, user)).rejects.toThrow(
      `Bed not found: ${id}`
    );
  });

  it('should throw forbidden error when user is not the creator of the bed', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: 'other-user@example.com',
      roles: ['user']
    };

    await expect(useCase.execute(bed.id.value, otherUser)).rejects.toThrow(
      `You do not have access to this bed: ${bed.id.value}`
    );
  });
});
