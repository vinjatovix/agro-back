import { Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

import { PlantInstanceMother } from '../../../../Contexts/Agro/PlantInstances/domain/mothers/PlantInstanceMother.js';

import { BedSeeder } from '../shared/seeders/index.js';

import {
  assertDocumentUnchanged,
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

  const plantInstances: unknown[] = Array.isArray(bed.plantInstances)
    ? (bed.plantInstances as unknown[])
    : [];

  await rawCollection('beds').updateOne(filter, {
    $set: {
      plantInstances: [
        ...plantInstances,
        PlantInstanceMother.create().toPrimitives()
      ]
    }
  });
});

Given('a bed exists for another user', async function (this: AgroWorld) {
  const bedSeeder = BedSeeder(
    suite().httpServer,
    tokenFor(this, 'anotherUser')
  );

  const bed = await bedSeeder.createOne();

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
