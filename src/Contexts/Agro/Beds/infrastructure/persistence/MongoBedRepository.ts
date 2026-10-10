import type { Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedFilter } from '../../domain/entities/types/BedFilter.js';
import type { BedPrimitives } from '../../domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import type { BedPersistenceMapper } from '../../mappers/interfaces/BedPersistenceMapper.js';
import type { MongoBedDocument } from './types/MongoBedDocument.js';

export type MongoBedRepositoryDependencies = {
  db: Db;
  bedPersistenceMapper: BedPersistenceMapper;
};

export class MongoBedRepository
  extends MongoCrudRepository<Bed, BedPrimitives, MongoBedDocument, BedFilter>
  implements BedRepository
{
  private readonly bedPersistenceMapper: BedPersistenceMapper;

  constructor({ db, bedPersistenceMapper }: MongoBedRepositoryDependencies) {
    super(db);
    this.bedPersistenceMapper = bedPersistenceMapper;
  }
  protected entityName(): string {
    return 'Bed';
  }
  protected collectionName(): string {
    return `${this.entityName().toLowerCase()}s`;
  }

  protected toDomain(document: MongoBedDocument): Bed {
    return this.bedPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(entity: Bed): MongoBedDocument {
    return this.bedPersistenceMapper.toMongoDocument(entity);
  }

  async findByUserId(userId: string): Promise<Bed[]> {
    const collection = this.collection();

    const documents = await collection
      .find({ userId: toMongoId(userId) })
      .toArray();

    return documents.map((doc) => this.toDomain(doc as MongoBedDocument));
  }

  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<Bed>> {
    return this.findOneDomain({
      _id: toMongoId(id),
      userId: toMongoId(userId),
      ...this.activeFilter()
    });
  }

  async conditionalIncrementVersion(
    id: string,
    expectedVersion: number
  ): Promise<void> {
    // `$and` keeps both conditions even if they ever share a key, as in
    // `updateWithDiff`.
    const filter = {
      _id: toMongoId(id),
      $and: [this.activeFilter(), this.versionFilter(expectedVersion)]
    };

    const result = await this.collection().updateOne(filter, {
      $inc: { version: 1 }
    });

    if (result.matchedCount === 0) {
      throw new DomainConflictException(`Bed was modified concurrently: ${id}`);
    }
  }

  protected activeFilter(): UnknownRecord {
    return { deleted: { $ne: true } };
  }
}
