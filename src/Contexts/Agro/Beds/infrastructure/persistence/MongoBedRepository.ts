import type { Db } from 'mongodb';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedFilter } from '../../domain/entities/types/BedFilter.js';
import type { BedPrimitives } from '../../domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import type { MongoBedDocument } from './types/MongoBedDocument.js';
import type { BedPersistenceMapper } from '../../mappers/interfaces/BedPersistenceMapper.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';

export class MongoBedRepository
  extends MongoCrudRepository<Bed, BedPrimitives, MongoBedDocument, BedFilter>
  implements BedRepository
{
  constructor(
    db: Db,
    private readonly bedPersistenceMapper: BedPersistenceMapper
  ) {
    super(db);
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
}
