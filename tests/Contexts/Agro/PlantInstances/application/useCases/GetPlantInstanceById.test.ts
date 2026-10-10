import { GetPlantInstanceById } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/GetPlantInstanceById.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  createUserId,
  randomUserId
} from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('GetPlantInstanceById', () => {
  let repository: PlantInstanceRepositoryMock;
  let useCase: GetPlantInstanceById;

  const user: UserSessionInfo = {
    id: random.uuid(),
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    repository = new PlantInstanceRepositoryMock();
    useCase = new GetPlantInstanceById({ plantInstanceRepository: repository });
  });

  it('returns an owned active plant instance', async () => {
    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
    });
    repository.addToStorage(crop);

    const result = await useCase.execute(crop.id, user);

    expect(result.id).toBe(crop.id);
    expect(result.userId).toBe(user.id);
  });

  it('throws DomainNotFoundException when crop does not exist', async () => {
    await expect(useCase.execute(random.uuid(), user)).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('throws DomainNotFoundException when crop belongs to another user', async () => {
    const crop = PlantInstanceMother.create({
      userId: randomUserId(),
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
    });
    repository.addToStorage(crop);

    await expect(useCase.execute(crop.id, user)).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('throws DomainNotFoundException when crop is marked as removed', async () => {
    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date()
    });
    repository.addToStorage(crop);

    await expect(useCase.execute(crop.id, user)).rejects.toThrow(
      DomainNotFoundException
    );
  });
});
