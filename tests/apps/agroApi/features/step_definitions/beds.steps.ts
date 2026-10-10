import { Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { BedSeeder } from '../shared/seeders/index.js';
import {
  assertDocumentUnchanged,
  currentResponse,
  prepareRequest,
  rawCollection,
  softDeleteDocument,
  suite,
  tokenFor,
  type AgroWorld
} from './utils/index.js';

Given('a bed exists', async function (this: AgroWorld) {
  const bedSeeder = BedSeeder(suite().httpServer, tokenFor(this, 'user'));
  const bed = await bedSeeder.createOne({});

  this.bedId = bed.id;
});

Given('the bed has a plant', async function (this: AgroWorld) {
  const bedId = this.bedId;
  if (bedId === undefined) {
    assert.fail('bedId not set');
  }

  const filter = { _id: toMongoId(bedId) };
  const bed = await rawCollection('beds').findOne(filter);
  if (bed === null) {
    assert.fail(`Bed ${bedId} not found`);
  }

  const cropId = random.uuid();
  await rawCollection('plant_instances').insertOne({
    _id: toMongoId(cropId),
    userId: bed.userId,
    bedId: toMongoId(bedId),
    plantId: toMongoId(random.uuid()),
    position: { x: 20, y: 20 },
    growthStatus: 'planted',
    instanceStatus: 'active',
    plantedAt: new Date().toISOString(),
    metadata: {
      createdAt: new Date(),
      createdBy: 'test-user',
      updatedAt: new Date(),
      updatedBy: 'test-user'
    },
    version: 0
  });

  this.cropId = cropId;
});

Given('a bed exists for another user', async function (this: AgroWorld) {
  const bedSeeder = BedSeeder(
    suite().httpServer,
    tokenFor(this, 'anotherUser')
  );
  const bed = await bedSeeder.createOne({});

  this.bedId = bed.id;
});

Given(
  'a soft-deleted bed exists for the current user',
  async function (this: AgroWorld) {
    const bedSeeder = BedSeeder(suite().httpServer, tokenFor(this, 'user'));
    const bed = await bedSeeder.createOne({});
    const bedIdStr = bed.id.toString();

    this.storedDocument = await softDeleteDocument('beds', bedIdStr, {
      deleted: true,
      deletedAt: new Date().toISOString()
    });
    this.bedId = bedIdStr;
  }
);

When('I get the bed', function (this: AgroWorld) {
  if (!this.bedId) {
    throw new TypeError('bedId not set');
  }

  prepareRequest(this, {
    method: 'GET',
    route: `/api/v1/beds/${this.bedId}`,
    role: 'user'
  });
});

Then('the bed should be unchanged', async function (this: AgroWorld) {
  await assertDocumentUnchanged(this, 'beds', this.bedId);
});

Then(
  'the bed plantInstances should contain crop UUIDs',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const bed = response.body as { plantInstances: unknown[] };
    assert.isArray(bed.plantInstances);
    assert.isAbove(bed.plantInstances.length, 0);
    assert.isString(bed.plantInstances[0]);
  }
);

Then(
  'the bed plantInstances should contain full crop objects',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const bed = response.body as {
      plantInstances: Array<{ id: string; growthStatus: string }>;
    };
    assert.isArray(bed.plantInstances);
    assert.isAbove(bed.plantInstances.length, 0);
    assert.isObject(bed.plantInstances[0]);
    assert.exists(bed.plantInstances[0]?.growthStatus);
  }
);
