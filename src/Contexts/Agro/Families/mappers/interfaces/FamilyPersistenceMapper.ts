import type { Family } from '../../domain/entities/Family.js';
import type { MongoFamilyDocument } from '../../infrastructure/persistence/types/MongoFamilyDocument.js';

export interface FamilyPersistenceMapper {
  fromMongoDocument(document: MongoFamilyDocument): Family;
  toMongoDocument(family: Family): MongoFamilyDocument;
}
