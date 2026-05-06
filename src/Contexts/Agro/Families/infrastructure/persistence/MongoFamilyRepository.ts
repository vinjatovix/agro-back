import { createError } from '../../../../../shared/errors/index.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import type { FamilyPrimitives } from '../../domain/types/FamilyPrimitives.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import { familyPersistenceMapper } from '../../mappers/familyPersistenceMapper.js';
import type { MongoFamilyDocument } from './types/MongoFamilyDocument.js';

export class MongoFamilyRepository
  extends MongoCrudRepository<
    Family,
    FamilyPrimitives,
    MongoFamilyDocument,
    FamilyFilter
  >
  implements FamilyRepository
{
  protected entityName(): string {
    return 'Family';
  }
  protected collectionName(): string {
    return 'families';
  }

  protected toDomain(document: MongoFamilyDocument): Family {
    return familyPersistenceMapper.fromMongoDocument(document);
  }

  protected toPrimitives(family: Family): FamilyPrimitives {
    return familyDomainMapper.toPrimitives(family);
  }

  protected toMongoDocument(family: Family): MongoFamilyDocument {
    return familyPersistenceMapper.toMongoDocument(family);
  }

  async findBySlug(slug: string): Promise<Family> {
    const collection = this.collection();
    const document = await collection.findOne<MongoFamilyDocument>({ slug });

    if (!document) {
      throw createError.notFound(`Family not found with slug: ${slug}`);
    }

    return this.toDomain(document);
  }
}
