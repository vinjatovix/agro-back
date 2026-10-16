import { asClass } from 'awilix';
import type { Db } from 'mongodb';

import { up } from '../../../../../../migrations/scripts/20261005140000-create-plant-instances-collection.js';
import type { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { MongoBedRepository } from '../../../../../../src/Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';
import {
  PlacePlantInstance,
  RemovePlantInstance,
  UpdatePlantInstance
} from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/index.js';
import type { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import { MongoPlantInstanceRepository } from '../../../../../../src/Contexts/Agro/PlantInstances/infrastructure/persistence/MongoPlantInstanceRepository.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantQueryMapper } from '../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';
import { MongoPlantRepository } from '../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { measureMs, median } from '../../../../../shared/utils/latency.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

const WRITE_BUDGET_MS = 150;
const LATENCY_RUNS = 10;
const START = new Coordinates(10, 10);
const TARGET = { x: 60, y: 60 };

let context: DbTestContext;
let db: Db;
let bedRepository: BedRepository;
let plantRepository: PlantRepository;
let plantInstanceRepository: MongoPlantInstanceRepository;

class ForcedFailure extends Error {}

type Placed = { bed: Bed; crop: PlantInstance; owner: UserSessionInfo };

function ownerOf(bed: Bed): UserSessionInfo {
  return {
    id: bed.userId,
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };
}

function useCase<T>(name: string): T {
  return context.container.createScope().resolve<T>(name);
}

async function seedBed(): Promise<{ bed: Bed; plantId: string }> {
  const bed = BedFactory.create();
  await bedRepository.save(bed);
  const plant = PlantFactory.random();
  await plantRepository.save(plant);

  return { bed, plantId: plant.id };
}

async function seedPlacedCrop(): Promise<Placed> {
  const { bed, plantId } = await seedBed();
  const crop = PlantInstanceMother.create({
    userId: bed.userId,
    bedId: bed.id,
    plantId: createPlantId(plantId),
    position: START
  });
  await plantInstanceRepository.save(crop);

  return { bed, crop, owner: ownerOf(bed) };
}

/** The crop write runs and then fails, after the bed raise. */
function failCropWriteAfterIt(): void {
  const writeCrop = plantInstanceRepository.updateWithDiff.bind(
    plantInstanceRepository
  );
  jest
    .spyOn(plantInstanceRepository, 'updateWithDiff')
    .mockImplementation(async (...args) => {
      await writeCrop(...args);
      throw new ForcedFailure();
    });
}

async function storedBedVersion(bed: Bed): Promise<number | undefined> {
  return (await bedRepository.findById(bed.id))?.version;
}

describe('Crop transactions (integration)', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      bedRepository: asClass(MongoBedRepository).singleton(),
      plantQueryMapper: asClass(PlantQueryMapper).singleton(),
      plantRepository: asClass(MongoPlantRepository).singleton(),
      plantInstanceRepository: asClass(
        MongoPlantInstanceRepository
      ).singleton(),
      placePlantInstance: asClass(PlacePlantInstance).scoped(),
      removePlantInstance: asClass(RemovePlantInstance).scoped(),
      updatePlantInstance: asClass(UpdatePlantInstance).scoped()
    });
    db = context.db;
    await up(db);

    const { container } = context;
    bedRepository = container.resolve<BedRepository>('bedRepository');
    plantRepository = container.resolve<PlantRepository>('plantRepository');
    plantInstanceRepository = container.resolve<MongoPlantInstanceRepository>(
      'plantInstanceRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('rollback', () => {
    it('keeps the bed version and the crop position when a move fails', async () => {
      const { bed, crop, owner } = await seedPlacedCrop();
      failCropWriteAfterIt();

      await expect(
        useCase<UpdatePlantInstance>('updatePlantInstance').execute(
          { id: crop.id, position: TARGET },
          owner,
          [crop.version]
        )
      ).rejects.toBeInstanceOf(ForcedFailure);

      expect(await storedBedVersion(bed)).toBe(bed.version);
      const stored = await plantInstanceRepository.findById(crop.id);
      expect(stored?.position).toEqual(START);
      expect(stored?.version).toBe(crop.version);
    });

    it('keeps the bed version and the crop active when a removal fails', async () => {
      const { bed, crop, owner } = await seedPlacedCrop();
      failCropWriteAfterIt();

      await expect(
        useCase<RemovePlantInstance>('removePlantInstance').execute(
          crop.id,
          owner,
          [crop.version]
        )
      ).rejects.toBeInstanceOf(ForcedFailure);

      expect(await storedBedVersion(bed)).toBe(bed.version);
      const stored = await plantInstanceRepository.findById(crop.id);
      expect(stored?.instanceStatus).toBe(PlantInstanceLifecycleStatus.ACTIVE);
      expect(stored?.version).toBe(crop.version);
    });
  });

  describe('commit', () => {
    it('raises the bed version exactly once on a move', async () => {
      const { bed, crop, owner } = await seedPlacedCrop();

      await useCase<UpdatePlantInstance>('updatePlantInstance').execute(
        { id: crop.id, position: TARGET },
        owner,
        [crop.version]
      );

      expect(await storedBedVersion(bed)).toBe(bed.version + 1);
      const stored = await plantInstanceRepository.findById(crop.id);
      expect(stored?.position).toEqual(new Coordinates(TARGET.x, TARGET.y));
    });

    it('raises the bed version exactly once on a removal', async () => {
      const { bed, crop, owner } = await seedPlacedCrop();

      await useCase<RemovePlantInstance>('removePlantInstance').execute(
        crop.id,
        owner,
        [crop.version]
      );

      expect(await storedBedVersion(bed)).toBe(bed.version + 1);
      const stored = await plantInstanceRepository.findById(crop.id);
      expect(stored?.instanceStatus).toBe(PlantInstanceLifecycleStatus.REMOVED);
    });
  });

  describe('latency (median of 10 runs)', () => {
    async function medianOf(
      operation: () => Promise<() => Promise<unknown>>
    ): Promise<number> {
      const samples: number[] = [];

      for (let run = 0; run < LATENCY_RUNS; run += 1) {
        samples.push(await measureMs(await operation()));
      }

      return median(samples);
    }

    it('places a crop within the write budget', async () => {
      const result = await medianOf(async () => {
        const { bed, plantId } = await seedBed();
        const place = useCase<PlacePlantInstance>('placePlantInstance');

        return () =>
          place.execute(
            { id: random.uuid(), bedId: bed.id, plantId, position: TARGET },
            ownerOf(bed)
          );
      });

      expect(result).toBeLessThan(WRITE_BUDGET_MS);
    });

    it('moves a crop within the write budget', async () => {
      const result = await medianOf(async () => {
        const { crop, owner } = await seedPlacedCrop();
        const update = useCase<UpdatePlantInstance>('updatePlantInstance');

        return () =>
          update.execute({ id: crop.id, position: TARGET }, owner, [
            crop.version
          ]);
      });

      expect(result).toBeLessThan(WRITE_BUDGET_MS);
    });

    it('removes a crop within the write budget', async () => {
      const result = await medianOf(async () => {
        const { crop, owner } = await seedPlacedCrop();
        const remove = useCase<RemovePlantInstance>('removePlantInstance');

        return () => remove.execute(crop.id, owner, [crop.version]);
      });

      expect(result).toBeLessThan(WRITE_BUDGET_MS);
    });
  });
});
