import { addPlantToBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/addPlantToBed.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('addPlantToBed', () => {
  let plantRepository: PlantRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let plant: Plant;
  let user: UserSessionInfo;

  beforeEach(() => {
    plantRepository = new PlantRepositoryMock();
    plant = PlantFactory.tomato();
    plantRepository.addToStorage(plant);
    bedRepository = new BedRepositoryMock();
    user = {
      username: 'test-user',
      id: random.uuid(),
      email: 'test-user@example.com',
      roles: ['user']
    };
  });

  it('throws not found error if bed does not exist', async () => {
    const bedId = random.uuid();
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await expect(
      addPlantToBed({
        bedId,
        plantInstance,
        plantRepository,
        bedRepository,
        user
      })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  it('throws not found error if bed is soft-deleted', async () => {
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(user.id)
    });
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await expect(
      addPlantToBed({
        bedId: bed.id,
        plantInstance,
        plantRepository,
        bedRepository,
        user
      })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  it('throws not found error if bed belongs to another user (foreign bed)', async () => {
    const otherUser: UserSessionInfo = {
      username: 'other-user',
      id: random.uuid(),
      email: 'other-user@example.com',
      roles: ['user']
    };
    const bed = BedFactory.fromUser(otherUser);
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await expect(
      addPlantToBed({
        bedId: bed.id,
        plantInstance,
        plantRepository,
        bedRepository,
        user
      })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  it('throws not found error when the plant being added does not exist and does not update bed', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);
    const missingPlant = PlantFactory.lettuce();
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      missingPlant,
      10,
      20
    );

    await expect(
      addPlantToBed({
        bedId: bed.id,
        plantInstance,
        plantRepository,
        bedRepository,
        user
      })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  it('throws not found error when soft-deleted new plant being added but does not update bed', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);
    const deletedPlant = PlantFactory.tomato({ deletedAt: new Date() });
    plantRepository.addToStorage(deletedPlant);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      deletedPlant,
      10,
      20
    );

    await expect(
      addPlantToBed({
        bedId: bed.id,
        plantInstance,
        plantRepository,
        bedRepository,
        user
      })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
  });

  it('resolves with plain ensureFound for existing bed plants (soft-deleted plants do not fail)', async () => {
    const existing = PlantInstanceMother.fromPlantAtPosition(plant, 10, 10);
    const bed = BedFactory.create({
      userId: createUserId(user.id),
      plantInstances: [existing]
    });
    bedRepository.addToStorage(bed);
    const newPlant = PlantInstanceMother.fromPlantAtPosition(plant, 100, 100);

    await addPlantToBed({
      bedId: bed.id,
      plantInstance: newPlant,
      plantRepository,
      bedRepository,
      user
    });

    expect(bedRepository.getStored(bed.id)?.plantInstances).toHaveLength(2);
  });

  it('successfully adds plant and persists via updateWithDiff', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await addPlantToBed({
      bedId: bed.id,
      plantInstance,
      plantRepository,
      bedRepository,
      user
    });

    expect(bedRepository.getStored(bed.id)?.plantInstances).toHaveLength(1);
    bedRepository.assertUpdateCalled();
  });

  it('stores the acting user and a refreshed time as audit data', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);
    const plantInstance = PlantInstanceMother.fromPlantAtPosition(
      plant,
      10,
      20
    );

    await addPlantToBed({
      bedId: bed.id,
      plantInstance,
      plantRepository,
      bedRepository,
      user: { ...user, username: 'planter' }
    });

    const stored = bedRepository.getStored(bed.id);
    expect(stored?.metadata.updatedBy).toBe('planter');
    expect(stored?.metadata.updatedAt.getTime()).toBeGreaterThanOrEqual(
      bed.metadata.updatedAt.getTime()
    );
  });
});
