import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

import {
  currentResponse,
  rawCollection,
  recordDocument,
  recordedMetadata,
  RESOURCES,
  usernameFor,
  type AgroWorld,
  type Resource,
  type Role
} from './utils/index.js';

const PREVIOUS_EDITOR = 'previous-editor';
const PREVIOUS_EDIT_DATE = new Date('2024-01-01T00:00:00.000Z');

/** Sets fields on the stored resource, then records it as the new snapshot. */
const updateStoredResource = async (
  world: AgroWorld,
  resource: Resource,
  fields: Record<string, unknown>
): Promise<void> => {
  const { collection, idKey } = RESOURCES[resource];
  const id = world[idKey];
  if (typeof id !== 'string') {
    assert.fail(`${resource} id not set`);
  }

  const result = await rawCollection(collection).updateOne(
    { _id: toMongoId(id) },
    { $set: fields }
  );
  assert.strictEqual(result.matchedCount, 1, `${resource} ${id} not found`);

  await recordDocument(world, collection, id);
};

Given(
  'I record the current {resource}',
  async function (this: AgroWorld, resource: Resource) {
    const { collection, idKey } = RESOURCES[resource];

    await recordDocument(this, collection, this[idKey]);
  }
);

Given(
  'the {resource} is stored at version {int}',
  async function (this: AgroWorld, resource: Resource, version: number) {
    await updateStoredResource(this, resource, { version });
  }
);

Given(
  'the {resource} was last updated by another user',
  async function (this: AgroWorld, resource: Resource) {
    await updateStoredResource(this, resource, {
      'metadata.updatedBy': PREVIOUS_EDITOR,
      'metadata.updatedAt': PREVIOUS_EDIT_DATE
    });
  }
);

Then(
  'the response audit data should show the {role} as last editor',
  async function (this: AgroWorld, role: Role) {
    const { metadata } = (await currentResponse(this)).body as {
      metadata: Record<
        'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy',
        string
      >;
    };
    const recorded = recordedMetadata(this);

    assert.strictEqual(metadata.updatedBy, usernameFor(this, role));
    assert.isAbove(
      new Date(metadata.updatedAt).getTime(),
      PREVIOUS_EDIT_DATE.getTime()
    );
    assert.strictEqual(metadata.createdBy, recorded.createdBy);
    assert.strictEqual(
      new Date(metadata.createdAt).toISOString(),
      new Date(recorded.createdAt).toISOString()
    );
  }
);

Then(
  'the stored {resource} should record the {role} as deleter at version {int}',
  async function (
    this: AgroWorld,
    resource: Resource,
    role: Role,
    version: number
  ) {
    const { collection, idKey } = RESOURCES[resource];
    const id = this[idKey];
    assert.exists(id, `${resource} id not set`);

    const document = await rawCollection(collection).findOne({
      _id: toMongoId(id)
    });
    assert.exists(document, `${resource} ${id} not found`);

    const metadata = document.metadata as {
      updatedBy: string;
      updatedAt: Date;
    };

    assert.strictEqual(metadata.updatedBy, usernameFor(this, role));
    assert.strictEqual(
      new Date(metadata.updatedAt).toISOString(),
      new Date(document.deletedAt as string).toISOString()
    );
    assert.strictEqual(document.version, version);
  }
);
