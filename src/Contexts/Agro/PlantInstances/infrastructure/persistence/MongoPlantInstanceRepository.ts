import type { Db } from 'mongodb';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { SortOptions } from '../../../../../shared/domain/query/interfaces/SortOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoPageQuery } from '../../../../shared/infrastructure/persistence/mongo/MongoPageQuery.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import {
  PlantInstanceLifecycleStatus,
  type PlantInstancePrimitives
} from '../../domain/entities/types/index.js';
import type {
  ListPlantInstancesParams,
  PlantInstanceRef,
  PlantInstanceRepository
} from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { PlantInstancePersistenceMapper } from '../../mappers/interfaces/PlantInstancePersistenceMapper.js';
import type { MongoPlantInstanceDocument } from './types/MongoPlantInstanceDocument.js';

// Oldest planted first, `_id` as tie-break, so a bed lists its crops stably.
const BED_CROPS_SORT = { plantedAt: 1, _id: 1 } as const;

export type MongoPlantInstanceRepositoryDependencies = {
  db: Db;
  plantInstancePersistenceMapper: PlantInstancePersistenceMapper;
};

export class MongoPlantInstanceRepository
  extends MongoCrudRepository<
    PlantInstance,
    PlantInstancePrimitives,
    MongoPlantInstanceDocument,
    unknown
  >
  implements PlantInstanceRepository
{
  private readonly persistenceMapper: PlantInstancePersistenceMapper;

  constructor({
    db,
    plantInstancePersistenceMapper
  }: MongoPlantInstanceRepositoryDependencies) {
    super(db);
    this.persistenceMapper = plantInstancePersistenceMapper;
  }

  protected entityName(): string {
    return 'PlantInstance';
  }

  protected collectionName(): string {
    return 'plant_instances';
  }

  protected toDomain(document: MongoPlantInstanceDocument): PlantInstance {
    return this.persistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(entity: PlantInstance): MongoPlantInstanceDocument {
    return this.persistenceMapper.toMongoDocument(entity);
  }

  protected activeFilter(): UnknownRecord {
    return { instanceStatus: PlantInstanceLifecycleStatus.ACTIVE };
  }

  // Insert-only: the id comes from the client, so an upsert would let a
  // request overwrite someone else's crop. A taken id fails as a conflict.
  async save(instance: PlantInstance): Promise<void> {
    const mongoDocument = this.toMongoDocument(instance);
    await this.handleMongoError(() =>
      this.collection().insertOne(mongoDocument)
    );
  }

  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<PlantInstance>> {
    return this.findOneDomain({
      _id: toMongoId(id),
      userId: toMongoId(userId),
      ...this.activeFilter()
    });
  }

  async listOwnedActive(
    params: ListPlantInstancesParams
  ): Promise<PaginatedResult<PlantInstance>> {
    const filter: UnknownRecord = {
      userId: toMongoId(params.userId),
      ...this.activeFilter()
    };

    if (params.bedId) {
      filter.bedId = toMongoId(params.bedId);
    }

    if (params.plantId) {
      filter.plantId = toMongoId(params.plantId);
    }

    // `_id` breaks ties: crops planted at the same instant are common, and
    // without a total order skip/limit could repeat or skip them across pages.
    const order = params.sort?.order ?? 'desc';
    const sort: SortOptions = { plantedAt: order, _id: order };

    const { documents, pagination } =
      await MongoPageQuery.find<MongoPlantInstanceDocument>(
        // Untyped on purpose: `PagedCollection` expects the default `_id`
        // type, and this collection's typed `_id` is a UUID/string.
        this.db.collection(this.collectionName()),
        {
          filter,
          sort,
          pagination: params.pagination
        }
      );

    return {
      data: documents.map((doc) => this.toDomain(doc)),
      pagination
    };
  }

  async findActiveByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstance[]> {
    if (bedIds.length === 0) return [];

    const documents = await this.collection()
      .find<MongoPlantInstanceDocument>(this.activeInBedsFilter(bedIds, userId))
      .sort(BED_CROPS_SORT)
      .toArray();

    return documents.map((doc) => this.toDomain(doc));
  }

  async findActiveRefsByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstanceRef[]> {
    if (bedIds.length === 0) return [];

    const documents = await this.collection()
      .find<Pick<MongoPlantInstanceDocument, '_id' | 'bedId'>>(
        this.activeInBedsFilter(bedIds, userId),
        { projection: { _id: 1, bedId: 1 } }
      )
      .sort(BED_CROPS_SORT)
      .toArray();

    return documents.map((doc) => ({
      id: fromMongoId(doc._id),
      bedId: fromMongoId(doc.bedId)
    }));
  }

  async findActiveByBedId(
    bedId: string,
    userId: string
  ): Promise<PlantInstance[]> {
    return this.findActiveByBedIds([bedId], userId);
  }

  async markAllInBedAsRemoved(
    bedId: string,
    userId: string,
    removedAt: Date,
    updatedBy: string
  ): Promise<number> {
    const result = await this.collection().updateMany(
      {
        bedId: toMongoId(bedId),
        userId: toMongoId(userId),
        ...this.activeFilter()
      },
      {
        $set: {
          instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
          removedAt: removedAt.toISOString(),
          'metadata.updatedAt': removedAt.toISOString(),
          'metadata.updatedBy': updatedBy
        },
        $inc: { version: 1 }
      }
    );

    return result.modifiedCount;
  }

  private activeInBedsFilter(bedIds: string[], userId: string): UnknownRecord {
    return {
      userId: toMongoId(userId),
      bedId: { $in: bedIds.map((id) => toMongoId(id)) },
      ...this.activeFilter()
    };
  }
}
