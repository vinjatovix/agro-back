import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { Family } from '../domain/entities/Family.js';
import type { MongoFamilyDocument } from '../infrastructure/persistence/types/MongoFamilyDocument.js';
import type { FamilyPersistenceMapper } from './interfaces/FamilyPersistenceMapper.js';

export const familyPersistenceMapper: FamilyPersistenceMapper = {
  fromMongoDocument: function (document: MongoFamilyDocument): Family {
    return Family.create({
      id: Uuid.create(fromMongoId(document._id)),
      slug: document.slug,
      name: document.name,
      aliases: document.aliases,
      scientificName: document.scientificName,
      shortDescription: document.shortDescription,
      highlights: document.highlights,
      ...(document.extra ? { extra: document.extra } : {}),
      metadata: Metadata.fromPrimitives(document.metadata)
    });
  },
  toMongoDocument: function (family: Family): MongoFamilyDocument {
    return {
      _id: toMongoId(family.idValue),
      slug: family.slug,
      name: family.name,
      aliases: family.aliases,
      scientificName: family.scientificName,
      shortDescription: family.shortDescription,
      highlights: family.highlights,
      ...(family.extra ? { extra: family.extra } : {}),
      metadata: family.metadata.toPrimitives()
    };
  }
};
