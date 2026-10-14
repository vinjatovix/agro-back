import type { Db, MongoClient } from 'mongodb';

import { up } from '../../../../../../../migrations/scripts/20261005140000-create-plant-instances-collection.js';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { DeleteBed } from '../../../../../../../src/Contexts/Agro/Beds/application/useCases/index.js';
import type { Bed } from '../../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import type { PlantInstanceRepository } from '../../../../../../../src/Contexts/Agro/PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { MongoPlantInstanceDocument } from '../../../../../../../src/Contexts/Agro/PlantInstances/infrastructure/persistence/types/MongoPlantInstanceDocument.js';
import type { PlantInstancePersistenceMapper } from '../../../../../../../src/Contexts/Agro/PlantInstances/mappers/interfaces/PlantInstancePersistenceMapper.js';
import type { UserSessionInfo } from '../../../../../../../src/Contexts/Auth/application/index.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { DBClientFactory } from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';
import { SOURCE_ROOT } from '../../../../../../shared/sourceRoot.js';
import { measureMs, median } from '../../../../../../shared/utils/latency.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantInstanceMother } from '../../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedFactory } from '../../../domain/mothers/BedFactory.js';

const WRITE_BUDGET_MS = 150;
const LATENCY_RUNS = 10;
const CROPS_PER_BED = 200;

let container: AppContainer;
let client: MongoClient;
let db: Db;
let environmentArranger: EnvironmentArranger;
let bedRepository: BedRepository;
let plantInstanceRepository: PlantInstanceRepository;
let persistenceMapper: PlantInstancePersistenceMapper;

class ForcedFailure extends Error {}

function ownerOf(bed: Bed): UserSessionInfo {
  return {
    id: bed.userId,
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };
}

function deleteBed(): DeleteBed {
  return container.createScope().resolve<DeleteBed>('deleteBed');
}

async function seedBedWithCrops(cropCount: number): Promise<Bed> {
  const bed = BedFactory.create();
  await bedRepository.save(bed);

  const crops = Array.from({ length: cropCount }, () =>
    persistenceMapper.toMongoDocument(
      PlantInstanceMother.create({ userId: bed.userId, bedId: bed.id })
    )
  );
  await db
    .collection<MongoPlantInstanceDocument>('plant_instances')
    .insertMany(crops);

  return bed;
}

async function cropsInBed(bed: Bed): Promise<MongoPlantInstanceDocument[]> {
  return db
    .collection<MongoPlantInstanceDocument>('plant_instances')
    .find({ bedId: toMongoId(bed.id) })
    .toArray();
}

describe('DeleteBed transaction (integration)', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      createTestDBConfig()
    );
    db = client.db();
    await up(db);

    container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });
    environmentArranger = container.resolve<EnvironmentArranger>(
      'environmentArranger'
    );
    bedRepository = container.resolve<BedRepository>('bedRepository');
    plantInstanceRepository = container.resolve<PlantInstanceRepository>(
      'plantInstanceRepository'
    );
    persistenceMapper = container.resolve<PlantInstancePersistenceMapper>(
      'plantInstancePersistenceMapper'
    );
  });

  beforeEach(async () => {
    await environmentArranger.arrange();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await client.close();
  });

  it('keeps the bed and every crop active when removing the crops fails', async () => {
    const bed = await seedBedWithCrops(3);
    const removeCrops = plantInstanceRepository.markAllInBedAsRemoved.bind(
      plantInstanceRepository
    );
    jest
      .spyOn(plantInstanceRepository, 'markAllInBedAsRemoved')
      .mockImplementation(async (...args) => {
        await removeCrops(...args);
        throw new ForcedFailure();
      });

    await expect(
      deleteBed().execute(bed.id, ownerOf(bed), [bed.version])
    ).rejects.toBeInstanceOf(ForcedFailure);

    const stored = await bedRepository.findById(bed.id);
    expect(stored?.isDeleted).toBe(false);
    expect(stored?.version).toBe(bed.version);
    const crops = await cropsInBed(bed);
    expect(crops).toHaveLength(3);
    expect(
      crops.every(
        (crop) => crop.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE
      )
    ).toBe(true);
  });

  it('deletes the bed and removes every crop at the same instant', async () => {
    const bed = await seedBedWithCrops(3);

    await deleteBed().execute(bed.id, ownerOf(bed), [bed.version]);

    const stored = await bedRepository.findById(bed.id);
    expect(stored?.isDeleted).toBe(true);
    const deletedAt = stored?.deletedAt?.toISOString();
    const crops = await cropsInBed(bed);
    expect(crops).toHaveLength(3);
    for (const crop of crops) {
      expect(crop.instanceStatus).toBe(PlantInstanceLifecycleStatus.REMOVED);
      expect(crop.removedAt).toBe(deletedAt);
    }
  });

  it(`deletes a bed with ${CROPS_PER_BED} crops within the write budget (median)`, async () => {
    const samples: number[] = [];

    for (let run = 0; run < LATENCY_RUNS; run += 1) {
      const bed = await seedBedWithCrops(CROPS_PER_BED);
      const useCase = deleteBed();

      samples.push(
        await measureMs(() =>
          useCase.execute(bed.id, ownerOf(bed), [bed.version])
        )
      );
    }

    expect(median(samples)).toBeLessThan(WRITE_BUDGET_MS);
  });
});
