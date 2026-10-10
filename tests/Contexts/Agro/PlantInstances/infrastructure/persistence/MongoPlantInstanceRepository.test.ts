import type { Db, MongoClient } from 'mongodb';
import { up } from '../../../../../../migrations/scripts/20261005140000-create-plant-instances-collection.js';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../src/apps/agroApi/container.js';
import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import type { PlantInstanceRepository } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { MongoPlantInstanceDocument } from '../../../../../../src/Contexts/Agro/PlantInstances/infrastructure/persistence/types/MongoPlantInstanceDocument.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { EnvironmentArranger } from '../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { DBClientFactory } from '../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';
import { SOURCE_ROOT } from '../../../../../shared/sourceRoot.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

let container: AppContainer;
let repository: PlantInstanceRepository;
let environmentArranger: EnvironmentArranger;
let client: MongoClient;
let db: Db;

describe('MongoPlantInstanceRepository (integration)', () => {
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
    repository = container.resolve<PlantInstanceRepository>(
      'plantInstanceRepository'
    );
  });

  beforeEach(async () => {
    await environmentArranger.arrange();
  });

  afterAll(async () => {
    await client.close();
  });

  it('saves and finds an owned active plant instance by id', async () => {
    const crop = PlantInstanceMother.create();

    await repository.save(crop);

    const found = await repository.findOwnedActiveById(crop.id, crop.userId);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(crop.id);
    expect(found?.userId).toBe(crop.userId);
    expect(found?.bedId).toBe(crop.bedId);
    expect(found?.plantId).toBe(crop.plantId);
  });

  it('persists and retrieves a positionless crop without position field in raw Mongo document', async () => {
    const crop = PlantInstanceMother.create({ position: undefined });

    await repository.save(crop);

    const rawDoc = await db
      .collection<MongoPlantInstanceDocument>('plant_instances')
      .findOne({ _id: toMongoId(crop.id) });

    expect(rawDoc).not.toBeNull();
    expect('position' in (rawDoc ?? {})).toBe(false);
    expect(rawDoc?.position).toBeUndefined();

    const retrieved = await repository.findOwnedActiveById(
      crop.id,
      crop.userId
    );
    expect(retrieved?.position).toBeUndefined();
  });

  it('returns null when finding a crop belonging to another user', async () => {
    const crop = PlantInstanceMother.create();

    await repository.save(crop);

    const found = await repository.findOwnedActiveById(
      crop.id,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(found).toBeNull();
  });

  it('rejects saving a crop whose id is already taken and keeps the original', async () => {
    const original = PlantInstanceMother.create();
    await repository.save(original);
    const intruder = PlantInstanceMother.create({ id: original.id });

    await expect(repository.save(intruder)).rejects.toBeInstanceOf(
      DomainConflictException
    );

    const stored = await repository.findOwnedActiveById(
      original.id,
      original.userId
    );
    expect(stored?.bedId).toBe(original.bedId);
  });

  it('returns active crops for a bed', async () => {
    const userId = randomUserId();
    const bedId = randomBedId();
    const crop1 = PlantInstanceMother.create({ userId, bedId });
    const crop2 = PlantInstanceMother.create({ userId, bedId });
    await repository.save(crop1);
    await repository.save(crop2);

    const crops = await repository.findActiveByBedId(bedId, userId);

    expect(crops).toHaveLength(2);
  });

  it('batch finds active crops across multiple bed ids', async () => {
    const userId = randomUserId();
    const bed1 = randomBedId();
    const bed2 = randomBedId();
    const crop1 = PlantInstanceMother.create({ userId, bedId: bed1 });
    const crop2 = PlantInstanceMother.create({ userId, bedId: bed2 });
    await repository.save(crop1);
    await repository.save(crop2);

    const crops = await repository.findActiveByBedIds([bed1, bed2], userId);

    expect(crops.map((c) => c.id).sort()).toEqual([crop1.id, crop2.id].sort());
  });

  it('reads only the id and bed of active crops, oldest planted first', async () => {
    const userId = randomUserId();
    const bedId = randomBedId();
    const newer = PlantInstanceMother.create({
      userId,
      bedId,
      plantedAt: new Date('2026-05-02')
    });
    const older = PlantInstanceMother.create({
      userId,
      bedId,
      plantedAt: new Date('2026-05-01')
    });
    await repository.save(newer);
    await repository.save(older);

    const refs = await repository.findActiveRefsByBedIds([bedId], userId);

    expect(refs).toEqual([
      { id: older.id, bedId },
      { id: newer.id, bedId }
    ]);
  });

  it('marks all active crops in a bed as removed', async () => {
    const userId = randomUserId();
    const bedId = randomBedId();
    const crop1 = PlantInstanceMother.create({ userId, bedId });
    const crop2 = PlantInstanceMother.create({ userId, bedId });
    await repository.save(crop1);
    await repository.save(crop2);

    const removedCount = await repository.markAllInBedAsRemoved(
      bedId,
      userId,
      new Date(),
      'system'
    );

    expect(removedCount).toBe(2);

    const activeCrops = await repository.findActiveByBedId(bedId, userId);
    expect(activeCrops).toHaveLength(0);
  });

  it('lists owned active crops with pagination', async () => {
    const userId = randomUserId();
    const bedId = randomBedId();
    const crop1 = PlantInstanceMother.create({
      userId,
      bedId,
      plantedAt: new Date('2026-05-01')
    });
    const crop2 = PlantInstanceMother.create({
      userId,
      bedId,
      plantedAt: new Date('2026-05-02')
    });
    await repository.save(crop1);
    await repository.save(crop2);

    const result = await repository.listOwnedActive({
      userId,
      bedId,
      pagination: { page: 1, limit: 10 }
    });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
  });

  it('pages through crops planted at the same instant without repeating or skipping any', async () => {
    const userId = randomUserId();
    const plantedAt = new Date('2026-05-01T00:00:00.000Z');
    const crops = Array.from({ length: 5 }, () =>
      PlantInstanceMother.create({ userId, plantedAt })
    );
    for (const crop of crops) {
      await repository.save(crop);
    }

    const pageIds: string[] = [];
    for (const page of [1, 2, 3]) {
      const result = await repository.listOwnedActive({
        userId,
        pagination: { page, limit: 2 }
      });
      pageIds.push(...result.data.map((c) => c.id));
    }

    expect(pageIds).toHaveLength(crops.length);
    expect([...pageIds].sort()).toEqual(crops.map((c) => c.id).sort());
  });

  describe('query index execution analysis', () => {
    const getStageNames = (plan: Record<string, unknown>): string[] => {
      const stages: string[] = [];
      const traverse = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const obj = node as Record<string, unknown>;
        if (typeof obj.stage === 'string') {
          stages.push(obj.stage);
        }
        if (obj.inputStage) traverse(obj.inputStage);
        if (Array.isArray(obj.inputStages)) obj.inputStages.forEach(traverse);
      };
      traverse(plan);
      return stages;
    };

    it('uses compound index for finding owned active crop by id and never COLLSCAN', async () => {
      const crop = PlantInstanceMother.create();
      await repository.save(crop);

      const explain = (await db
        .collection<MongoPlantInstanceDocument>('plant_instances')
        .find({
          _id: toMongoId(crop.id),
          userId: toMongoId(crop.userId),
          instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
        })
        .explain('executionStats')) as Record<string, unknown>;

      const executionStages = getStageNames(
        (explain.executionStats as Record<string, unknown>)
          ?.executionStages as Record<string, unknown>
      );

      expect(executionStages).toContain('IXSCAN');
      expect(executionStages).not.toContain('COLLSCAN');
    });

    it('uses compound index for listing crops with plantedAt sort and never COLLSCAN', async () => {
      const crop = PlantInstanceMother.create();
      await repository.save(crop);

      const explain = (await db
        .collection<MongoPlantInstanceDocument>('plant_instances')
        .find({
          userId: toMongoId(crop.userId),
          instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
        })
        .sort({ plantedAt: -1, _id: -1 })
        .explain('executionStats')) as Record<string, unknown>;

      const executionStages = getStageNames(
        (explain.executionStats as Record<string, unknown>)
          ?.executionStages as Record<string, unknown>
      );

      expect(executionStages).toContain('IXSCAN');
      expect(executionStages).not.toContain('COLLSCAN');
      expect(executionStages).not.toContain('SORT');
    });

    it('uses compound index for finding active crops by bed id and never COLLSCAN', async () => {
      const crop = PlantInstanceMother.create();
      await repository.save(crop);

      const explain = (await db
        .collection<MongoPlantInstanceDocument>('plant_instances')
        .find({
          bedId: toMongoId(crop.bedId),
          userId: toMongoId(crop.userId),
          instanceStatus: PlantInstanceLifecycleStatus.ACTIVE
        })
        .sort({ plantedAt: 1, _id: 1 })
        .explain('executionStats')) as Record<string, unknown>;

      const executionStages = getStageNames(
        (explain.executionStats as Record<string, unknown>)
          ?.executionStages as Record<string, unknown>
      );

      expect(executionStages).toContain('IXSCAN');
      expect(executionStages).not.toContain('COLLSCAN');
      expect(executionStages).not.toContain('SORT');
    });
  });
});
