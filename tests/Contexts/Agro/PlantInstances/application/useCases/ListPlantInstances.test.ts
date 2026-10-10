import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { ListPlantInstances } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/ListPlantInstances.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  createUserId,
  randomUserId
} from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('ListPlantInstances', () => {
  let repository: PlantInstanceRepositoryMock;
  let useCase: ListPlantInstances;

  const user: UserSessionInfo = {
    id: random.uuid(),
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    repository = new PlantInstanceRepositoryMock();
    useCase = new ListPlantInstances({ plantInstanceRepository: repository });
  });

  it('lists active crops owned by the user', async () => {
    const crop1 = PlantInstanceMother.create({ userId: createUserId(user.id) });
    const crop2 = PlantInstanceMother.create({ userId: createUserId(user.id) });
    const foreignCrop = PlantInstanceMother.create({ userId: randomUserId() });
    const removedCrop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
      removedAt: new Date()
    });

    repository.addToStorage(crop1);
    repository.addToStorage(crop2);
    repository.addToStorage(foreignCrop);
    repository.addToStorage(removedCrop);

    const result = await useCase.execute(
      { pagination: { page: 1, limit: 10 } },
      user
    );

    expect(result.data).toHaveLength(2);
    expect(result.data.map((c) => c.id)).toContain(crop1.id);
    expect(result.data.map((c) => c.id)).toContain(crop2.id);
    expect(result.pagination.totalItems).toBe(2);
  });

  it('filters active crops by bedId', async () => {
    const targetBedId = randomBedId();
    const otherBedId = randomBedId();

    const crop1 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: targetBedId
    });
    const crop2 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: otherBedId
    });
    repository.addToStorage(crop1);
    repository.addToStorage(crop2);

    const result = await useCase.execute(
      {
        filter: { bedId: { eq: targetBedId } },
        pagination: { page: 1, limit: 10 }
      },
      user
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(crop1.id);
  });

  it('filters active crops by plantId', async () => {
    const targetPlantId = randomPlantId();
    const otherPlantId = randomPlantId();

    const crop1 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      plantId: targetPlantId
    });
    const crop2 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      plantId: otherPlantId
    });
    repository.addToStorage(crop1);
    repository.addToStorage(crop2);

    const result = await useCase.execute(
      {
        filter: { plantId: { eq: targetPlantId } },
        pagination: { page: 1, limit: 10 }
      },
      user
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(crop1.id);
  });
});
