import type { Db } from 'mongodb';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import type { FamilyPrimitives } from '../../domain/types/FamilyPrimitives.js';
import type { MongoFamilyDocument } from './types/MongoFamilyDocument.js';
import type { FamilyPersistenceMapper } from '../../mappers/interfaces/FamilyPersistenceMapper.js';

export class MongoFamilyRepository
  extends MongoCrudRepository<
    Family,
    FamilyPrimitives,
    MongoFamilyDocument,
    FamilyFilter
  >
  implements FamilyRepository
{
  constructor(
    db: Db,
    private readonly familyPersistenceMapper: FamilyPersistenceMapper
  ) {
    super(db);
  }
  protected entityName(): string {
    return 'Family';
  }
  protected collectionName(): string {
    return 'families';
  }

  protected toDomain(document: MongoFamilyDocument): Family {
    return this.familyPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(family: Family): MongoFamilyDocument {
    return this.familyPersistenceMapper.toMongoDocument(family);
  }

  async findBySlug(slug: string): Promise<Family> {
    const collection = this.collection();
    const document = await collection.findOne<MongoFamilyDocument>({ slug });

    if (!document) {
      throw new DomainNotFoundException(`Family not found with slug: ${slug}`);
    }

    return this.toDomain(document);
  }
}
