import { UpdatePlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/UpdatePlantInstance.js';
import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('UpdatePlantInstance', () => {
  let bedRepository: BedRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let spatialService: CropSpatialService;
  let unitOfWork: UnitOfWorkMock;
  let useCase: UpdatePlantInstance;

  const user: UserSessionInfo = {
    id: random.uuid(),
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    plantRepository = new PlantRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    spatialService = new CropSpatialService();
    unitOfWork = new UnitOfWorkMock();

    useCase = new UpdatePlantInstance({
      bedRepository,
      plantRepository,
      plantInstanceRepository,
      cropSpatialService: spatialService,
      unitOfWork
    });
  });

  it('updates non-spatial attributes without modifying bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      growthStatus: CropGrowthStatus.PLANTED,
      variety: 'Old'
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(
      {
        id: crop.id,
        growthStatus: CropGrowthStatus.GROWING,
        variety: 'New Variety'
      },
      user,
      [crop.version]
    );

    expect(result.growthStatus).toBe(CropGrowthStatus.GROWING);
    expect(result.variety).toBe('New Variety');
    expect(result.version).toBe(1);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('clears variety and notes when they are sent as null', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      variety: 'Roma',
      notes: 'Near the edge'
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(
      { id: crop.id, variety: null, notes: null },
      user,
      [crop.version]
    );

    expect(result.variety).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.version).toBe(1);
  });

  it('moves crop to new coordinates and increments bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(10, 10)
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(
      {
        id: crop.id,
        position: { x: 80, y: 80 }
      },
      user,
      [crop.version]
    );

    expect(result.position).toEqual(new Coordinates(80, 80));
    expect(result.version).toBe(1);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('does not collide with self when moving slightly', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(50, 50)
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(
      {
        id: crop.id,
        position: { x: 51, y: 51 }
      },
      user,
      [crop.version]
    );

    expect(result.position).toEqual(new Coordinates(51, 51));
  });

  it('throws DomainConflictException when moving to coordinates that collide with another crop', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(10, 10)
    });
    const crop2 = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(60, 60)
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    await expect(
      useCase.execute(
        {
          id: crop1.id,
          position: { x: 62, y: 62 }
        },
        user,
        [crop1.version]
      )
    ).rejects.toThrow(DomainConflictException);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('moves a crop whose plant was later soft-deleted from the catalog', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random({ deletedAt: new Date() });
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(10, 10)
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(
      { id: crop.id, position: { x: 80, y: 80 } },
      user,
      [crop.version]
    );

    expect(result.position).toEqual(new Coordinates(80, 80));
  });

  it('leaves the bed version untouched when a move comes with invalid details', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      userId: createUserId(user.id),
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(10, 10)
    });
    plantInstanceRepository.addToStorage(crop);

    await expect(
      useCase.execute(
        {
          id: crop.id,
          position: { x: 80, y: 80 },
          variety: random.word().padEnd(101, 'x')
        },
        user,
        [crop.version]
      )
    ).rejects.toThrow(InvalidArgumentException);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('throws DomainNotFoundException when crop does not exist', async () => {
    await expect(
      useCase.execute(
        {
          id: random.uuid(),
          growthStatus: CropGrowthStatus.HARVESTED
        },
        user,
        [0]
      )
    ).rejects.toThrow(DomainNotFoundException);
  });

  describe('unit of work', () => {
    function seedCrop(): {
      bed: ReturnType<typeof BedFactory.fromUser>;
      crop: PlantInstance;
    } {
      const bed = BedFactory.fromUser(user);
      bedRepository.addToStorage(bed);
      const plant = PlantFactory.random();
      plantRepository.addToStorage(plant);
      const crop = PlantInstanceMother.create({
        userId: createUserId(user.id),
        bedId: bed.id,
        plantId: plant.id,
        position: new Coordinates(10, 10)
      });
      plantInstanceRepository.addToStorage(crop);

      return { bed, crop };
    }

    function traceWrites(): void {
      const raiseBed = unitOfWork.trace(
        'raiseBed',
        bedRepository.conditionalIncrementVersion.bind(bedRepository)
      );
      jest
        .spyOn(bedRepository, 'conditionalIncrementVersion')
        .mockImplementation(raiseBed);
      const writeCrop = unitOfWork.trace(
        'writeCrop',
        plantInstanceRepository.updateWithDiff.bind(plantInstanceRepository)
      );
      jest
        .spyOn(plantInstanceRepository, 'updateWithDiff')
        .mockImplementation(writeCrop);
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('raises the bed version and writes the moved crop inside one unit', async () => {
      const { crop } = seedCrop();
      const initialVersion = crop.version;
      traceWrites();

      const result = await useCase.execute(
        { id: crop.id, position: { x: 60, y: 60 } },
        user,
        [crop.version]
      );

      expect(unitOfWork.runCount).toBe(1);
      expect(unitOfWork.tracedCalls).toEqual([
        { name: 'raiseBed', insideUnit: true, unit: 1 },
        { name: 'writeCrop', insideUnit: true, unit: 1 }
      ]);
      expect(result.version).toBe(initialVersion + 1);
    });

    it('syncs the crop version outside the unit, so a retried unit syncs it once', async () => {
      const { crop } = seedCrop();
      const insideUnitAtSync: boolean[] = [];
      jest
        .spyOn(PlantInstance.prototype, 'syncVersion')
        .mockImplementation(() => {
          insideUnitAtSync.push(unitOfWork.isInsideUnit());
        });

      await useCase.execute({ id: crop.id, position: { x: 60, y: 60 } }, user, [
        crop.version
      ]);

      expect(insideUnitAtSync).toEqual([false]);
    });

    it('keeps a details-only edit out of any unit and leaves the bed version', async () => {
      const { bed, crop } = seedCrop();
      traceWrites();

      await useCase.execute(
        {
          id: crop.id,
          growthStatus: CropGrowthStatus.GROWING,
          notes: 'Mulched'
        },
        user,
        [crop.version]
      );

      expect(unitOfWork.runCount).toBe(0);
      expect(unitOfWork.tracedCalls).toEqual([
        { name: 'writeCrop', insideUnit: false, unit: 0 }
      ]);
      expect((await bedRepository.findById(bed.id))?.version).toBe(bed.version);
    });

    it('never opens a unit when the move breaks a placement rule', async () => {
      const { bed, crop } = seedCrop();

      await expect(
        useCase.execute(
          { id: crop.id, position: { x: bed.width.value + 50, y: 10 } },
          user,
          [crop.version]
        )
      ).rejects.toThrow(DomainConflictException);

      expect(unitOfWork.runCount).toBe(0);
    });

    it('never opens a unit for a stale If-Match', async () => {
      const { crop } = seedCrop();

      await expect(
        useCase.execute({ id: crop.id, position: { x: 60, y: 60 } }, user, [
          crop.version + 1
        ])
      ).rejects.toThrow(DomainStaleVersionException);

      expect(unitOfWork.runCount).toBe(0);
    });
  });
});
