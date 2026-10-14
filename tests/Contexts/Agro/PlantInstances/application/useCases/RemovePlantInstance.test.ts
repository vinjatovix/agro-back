import { RemovePlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/RemovePlantInstance.js';
import type { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  createUserId,
  randomUserId
} from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('RemovePlantInstance', () => {
  let bedRepository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let unitOfWork: UnitOfWorkMock;
  let useCase: RemovePlantInstance;

  const user: UserSessionInfo = {
    id: random.uuid(),
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    unitOfWork = new UnitOfWorkMock();

    useCase = new RemovePlantInstance({
      bedRepository,
      plantInstanceRepository,
      unitOfWork
    });
  });

  it('removes crop, increments parent bed version, and marks crop as removed', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    await useCase.execute(crop.id, user, [0]);

    const storedCrop = plantInstanceRepository.getStored(crop.id);
    expect(storedCrop?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.REMOVED
    );
    expect(storedCrop?.removedAt).toBeInstanceOf(Date);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('throws DomainStaleVersionException when expected versions mismatch', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    await expect(useCase.execute(crop.id, user, [99])).rejects.toThrow(
      DomainStaleVersionException
    );
  });

  it('throws DomainNotFoundException when crop does not exist', async () => {
    await expect(useCase.execute(random.uuid(), user, [0])).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('throws DomainNotFoundException when crop belongs to another user', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: randomUserId(),
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    await expect(useCase.execute(crop.id, user, [0])).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('throws DomainConflictException when parent bed has a concurrent version conflict', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    jest
      .spyOn(bedRepository, 'conditionalIncrementVersion')
      .mockRejectedValueOnce(
        new DomainConflictException('Bed was modified concurrently')
      );

    await expect(useCase.execute(crop.id, user, [0])).rejects.toThrow(
      DomainConflictException
    );
  });

  describe('unit of work', () => {
    function seedCrop(): PlantInstance {
      const bed = BedFactory.fromUser(user);
      bedRepository.addToStorage(bed);
      const crop = PlantInstanceMother.create({
        userId: createUserId(user.id),
        bedId: bed.id
      });
      plantInstanceRepository.addToStorage(crop);

      return crop;
    }

    it('raises the bed version and removes the crop inside one unit', async () => {
      const crop = seedCrop();
      const raiseBed = unitOfWork.trace(
        'raiseBed',
        bedRepository.conditionalIncrementVersion.bind(bedRepository)
      );
      jest
        .spyOn(bedRepository, 'conditionalIncrementVersion')
        .mockImplementation(raiseBed);
      const removeCrop = unitOfWork.trace(
        'removeCrop',
        plantInstanceRepository.updateWithDiff.bind(plantInstanceRepository)
      );
      jest
        .spyOn(plantInstanceRepository, 'updateWithDiff')
        .mockImplementation(removeCrop);

      await useCase.execute(crop.id, user, [crop.version]);

      expect(unitOfWork.runCount).toBe(1);
      expect(unitOfWork.tracedCalls).toEqual([
        { name: 'raiseBed', insideUnit: true, unit: 1 },
        { name: 'removeCrop', insideUnit: true, unit: 1 }
      ]);
    });

    it('never opens a unit for a missing crop', async () => {
      await expect(
        useCase.execute(random.uuid(), user, [0])
      ).rejects.toBeInstanceOf(DomainNotFoundException);

      expect(unitOfWork.runCount).toBe(0);
    });

    it.each([
      ['a missing If-Match', []],
      ['a stale If-Match', [99]]
    ])(
      'never opens a unit for %s',
      async (_case, expectedVersions: number[]) => {
        const crop = seedCrop();

        await expect(
          useCase.execute(crop.id, user, expectedVersions)
        ).rejects.toBeInstanceOf(DomainStaleVersionException);

        expect(unitOfWork.runCount).toBe(0);
      }
    );
  });
});
