import { assert } from 'chai';
import type { Binary, Collection } from 'mongodb';

import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { Nullable } from '../../../../../../src/shared/domain/types/Nullable.js';
import { suite } from './suite.js';
import type { AgroWorld } from './world.js';

export type RawDocument = { _id: Binary | string } & Record<string, unknown>;

export const rawCollection = (name: string): Collection<RawDocument> =>
  suite().client.db().collection<RawDocument>(name);

export const softDeleteDocument = async (
  collectionName: string,
  id: string,
  fields: Record<string, unknown>
): Promise<Nullable<Record<string, unknown>>> => {
  const collection = rawCollection(collectionName);
  const filter = { _id: toMongoId(id) };

  const result = await collection.updateOne(filter, { $set: fields });

  assert.strictEqual(
    result.matchedCount,
    1,
    `Expected to soft-delete ${collectionName} document ${id}`
  );

  return collection.findOne(filter);
};

export const recordDocument = async (
  world: AgroWorld,
  collectionName: string,
  id: string | undefined
): Promise<void> => {
  assert.exists(id, `${collectionName} id not set`);

  world.storedDocument = await rawCollection(collectionName).findOne({
    _id: toMongoId(id)
  });

  assert.exists(world.storedDocument, `${collectionName} ${id} not found`);
};

export const assertDocumentUnchanged = async (
  world: AgroWorld,
  collectionName: string,
  id: string | undefined
): Promise<void> => {
  assert.exists(id, `${collectionName} id not set`);
  assert.exists(world.storedDocument, 'No stored document to compare with');

  const current = await rawCollection(collectionName).findOne({
    _id: toMongoId(id)
  });

  assert.deepEqual(current, world.storedDocument);
};

export const recordedMetadata = (
  world: AgroWorld
): { createdAt: Date | string; createdBy: string } => {
  if (!world.storedDocument) {
    assert.fail('No stored document recorded');
  }

  assert.isObject(
    world.storedDocument.metadata,
    'Stored document has no metadata'
  );

  return world.storedDocument.metadata as {
    createdAt: Date | string;
    createdBy: string;
  };
};
