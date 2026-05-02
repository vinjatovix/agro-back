import { diffObjects } from '../../../../../shared/domain/diff/diffObjects.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { createError } from '../../../../../shared/errors/index.js';
import { Username } from '../../../../Auth/domain/value-objects/Username.js';
import { updateMetadata } from '../../../application/utils/updateMetadata.js';
import { toMongoId } from './MongoId.js';
import { MongoRepository } from './MongoRepository.js';
import type { Entity, WithId } from './types/index.js';

export abstract class MongoCrudRepository<
  TDomain,
  TPrimitives extends WithId,
  TDocument extends Entity
> extends MongoRepository {
  protected abstract toDomain(doc: TDocument): TDomain;
  protected abstract toPrimitives(entity: TDomain): TPrimitives;
  protected abstract entityName(): string;

  async findById(id: string): Promise<TDomain> {
    const collection = await this.collection();

    const document = await collection.findOne<TDocument>({
      _id: toMongoId(id)
    });

    if (!document) {
      throw createError.notFound(`${this.entityName()} not found: ${id}`);
    }

    return this.toDomain(document);
  }

  async save(entity: TDomain & { id: { value: string } }): Promise<void> {
    await this.persist(entity.id.value, this.toPrimitives(entity));
  }

  async findAll(): Promise<TDomain[]> {
    const collection = await this.collection();

    const docs = await collection.find<TDocument>({}).toArray();

    return docs.map((doc) => this.toDomain(doc));
  }

  async exists(id: string): Promise<boolean> {
    const collection = await this.collection();

    const count = await collection.countDocuments({
      _id: toMongoId(id)
    });

    return count > 0;
  }

  async updateWithDiff(
    current: TPrimitives,
    updated: TPrimitives,
    username: string
  ): Promise<void> {
    const collection = await this.collection();

    const mongoId = toMongoId(current.id);

    const diff = diffObjects(current, updated);
    const patch = this.normalizePatch(diff);

    const hasSet = Object.keys(patch.set).length > 0;
    const hasUnset = Object.keys(patch.unset).length > 0;

    if (!hasSet && !hasUnset) return;

    const metadata = updateMetadata(
      new Username(username)
    ) as unknown as UnknownRecord;

    const updateQuery: {
      $set?: UnknownRecord;
      $unset?: Record<string, ''>;
    } = {};

    updateQuery.$set = hasSet ? { ...patch.set, ...metadata } : metadata;

    if (hasUnset) {
      updateQuery.$unset = patch.unset;
    }

    const result = await collection.updateOne({ _id: mongoId }, updateQuery);

    if (result.matchedCount === 0) {
      throw createError.notFound(
        `${this.entityName()} not found: ${current.id}`
      );
    }
  }
}
