import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import {
  currentResponse,
  rawCollection,
  type AgroWorld
} from './utils/index.js';

const seedCropInCurrentBed = async (
  world: AgroWorld,
  fields: Record<string, unknown>
): Promise<void> => {
  if (!world.bedId) {
    assert.fail('bedId not set');
  }

  const bed = await rawCollection('beds').findOne({
    _id: toMongoId(world.bedId)
  });
  if (!bed) {
    assert.fail(`Bed ${world.bedId} not found`);
  }

  const cropId = random.uuid();
  const plantId = world.plantId ?? random.uuid();

  await rawCollection('plant_instances').insertOne({
    _id: toMongoId(cropId),
    userId: bed.userId,
    bedId: toMongoId(world.bedId),
    plantId: toMongoId(plantId),
    position: { x: 30, y: 30 },
    growthStatus: 'planted',
    instanceStatus: 'active',
    plantedAt: new Date().toISOString(),
    metadata: {
      createdAt: new Date(),
      createdBy: 'test-user',
      updatedAt: new Date(),
      updatedBy: 'test-user'
    },
    version: 0,
    ...fields
  });

  world.cropId = cropId;
};

Given('a crop exists in the bed', async function (this: AgroWorld) {
  await seedCropInCurrentBed(this, {});
});

Given(
  'a crop with variety and notes exists in the bed',
  async function (this: AgroWorld) {
    await seedCropInCurrentBed(this, {
      variety: 'Roma',
      notes: 'Near the edge'
    });
  }
);

Given(
  'a crop exists in the bed at {int}, {int}',
  async function (this: AgroWorld, x: number, y: number) {
    await seedCropInCurrentBed(this, { position: { x, y } });
  }
);

Then(
  'the bed stored version should be {int}',
  async function (this: AgroWorld, expectedVersion: number) {
    if (!this.bedId) {
      assert.fail('bedId not set');
    }

    const bed = await rawCollection('beds').findOne({
      _id: toMongoId(this.bedId)
    });
    assert.exists(bed, `Bed ${this.bedId} not found in database`);
    const actualVersion = (bed as { version?: number } | null)?.version;
    assert.strictEqual(
      actualVersion,
      expectedVersion,
      `Expected bed version to be ${expectedVersion} but got ${String(actualVersion)}`
    );
  }
);

Then('the response crop should be active', async function (this: AgroWorld) {
  const response = await currentResponse(this);
  const body = response.body as { instanceStatus?: string };
  assert.strictEqual(body.instanceStatus, 'active');
});

Then('the crop should be removed', async function (this: AgroWorld) {
  if (!this.cropId) {
    assert.fail('cropId not set');
  }

  const crop = await rawCollection('plant_instances').findOne({
    _id: toMongoId(this.cropId)
  });
  assert.exists(crop, `Crop ${this.cropId} not found`);
  const cropDoc = crop as {
    instanceStatus?: string;
    removedAt?: unknown;
  } | null;
  assert.strictEqual(cropDoc?.instanceStatus, 'removed');
  assert.exists(cropDoc?.removedAt);
});

Then(
  'the stored crop should not have the fields {string}',
  async function (this: AgroWorld, fields: string) {
    if (!this.cropId) {
      assert.fail('cropId not set');
    }

    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(this.cropId)
    });
    assert.exists(crop, `Crop ${this.cropId} not found`);
    for (const field of fields.split(',')) {
      assert.notProperty(crop, field.trim());
    }
  }
);

Then(
  'the crop should not belong to the current bed',
  async function (this: AgroWorld) {
    if (!this.cropId || !this.bedId) {
      assert.fail('cropId or bedId not set');
    }

    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(this.cropId)
    });
    assert.exists(crop, `Crop ${this.cropId} not found`);
    assert.notDeepEqual(crop?.bedId, toMongoId(this.bedId));
  }
);

Then('the bed should have no active crops', async function (this: AgroWorld) {
  if (!this.bedId) {
    assert.fail('bedId not set');
  }

  const activeCount = await rawCollection('plant_instances').countDocuments({
    bedId: toMongoId(this.bedId),
    instanceStatus: 'active'
  });
  assert.strictEqual(activeCount, 0);
});
