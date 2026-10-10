import { PlacePlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/PlacePlantInstance.js';
import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('PlacePlantInstance', () => {
  let bedRepository: BedRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let spatialService: CropSpatialService;
  let useCase: PlacePlantInstance;

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

    useCase = new PlacePlantInstance({
      bedRepository,
      plantRepository,
      plantInstanceRepository,
      cropSpatialService: spatialService
    });
  });

  it('places a crop in a bed successfully and increments the bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: { x: 50, y: 50 },
      growthStatus: CropGrowthStatus.PLANTED,
      variety: 'San Marzano',
      notes: 'Best for sauce'
    };

    const result = await useCase.execute(input, user);

    expect(result.id).toBe(input.id);
    expect(result.userId).toBe(user.id);
    expect(result.bedId).toBe(bed.id);
    expect(result.plantId).toBe(plant.id);
    expect(result.position).toEqual(new Coordinates(50, 50));
    expect(result.variety).toBe('San Marzano');
    expect(result.notes).toBe('Best for sauce');
    expect(result.metadata.createdBy).toBe(user.username);
    expect(result.version).toBe(0);

    const storedCrop = plantInstanceRepository.getStored(input.id);
    expect(storedCrop).toBeDefined();

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('leaves the bed version untouched when the crop breaks an invariant', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    await expect(
      useCase.execute(
        {
          id: random.uuid(),
          bedId: bed.id,
          plantId: plant.id,
          position: { x: 50, y: 50 },
          variety: random.word().padEnd(101, 'x')
        },
        user
      )
    ).rejects.toThrow(InvalidArgumentException);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('allows placing a positionless crop in a bed', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: undefined
    };

    const result = await useCase.execute(input, user);

    expect(result.position).toBeUndefined();
    expect(plantInstanceRepository.getStored(input.id)).toBeDefined();
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('throws DomainNotFoundException when bed does not exist', async () => {
    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      id: random.uuid(),
      bedId: random.uuid(),
      plantId: plant.id,
      position: { x: 10, y: 10 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainNotFoundException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
  });

  it('throws DomainNotFoundException when bed belongs to another user', async () => {
    const foreignUser: UserSessionInfo = {
      id: random.uuid(),
      username: 'other',
      email: random.email(),
      roles: ['user']
    };
    const bed = BedFactory.fromUser(foreignUser);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: { x: 10, y: 10 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainNotFoundException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
  });

  it('throws DomainNotFoundException when catalog plant does not exist', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: random.uuid(),
      position: { x: 10, y: 10 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainNotFoundException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
  });

  it('throws DomainConflictException when placement coordinates are outside bed boundaries', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: { x: bed.width.value + 50, y: 50 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('throws DomainConflictException when proposed crop collides with an existing neighbor crop', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const existingCrop = PlantInstanceMother.create({
      userId: bed.userId,
      bedId: bed.id,
      plantId: plant.id,
      position: new Coordinates(30, 30)
    });
    plantInstanceRepository.addToStorage(existingCrop);

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: { x: 32, y: 32 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('throws DomainConflictException when bed was concurrently modified', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    jest
      .spyOn(bedRepository, 'conditionalIncrementVersion')
      .mockRejectedValueOnce(
        new DomainConflictException('Bed was modified concurrently')
      );

    const input = {
      id: random.uuid(),
      bedId: bed.id,
      plantId: plant.id,
      position: { x: 50, y: 50 }
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );
    expect(plantInstanceRepository.saveCalls).toHaveLength(0);
  });
});
