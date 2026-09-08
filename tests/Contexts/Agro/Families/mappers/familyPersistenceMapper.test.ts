import { familyPersistenceMapper } from '../../../../../src/Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { Family } from '../../../../../src/Contexts/Agro/Families/domain/entities/Family.js';
import {
  toMongoId,
  fromMongoId
} from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { MongoFamilyDocument } from '../../../../../src/Contexts/Agro/Families/infrastructure/persistence/types/MongoFamilyDocument.js';
import { FamilyScenarios } from '../domain/mothers/FamilyScenarios.js';

describe('familyPersistenceMapper', () => {
  const familyWithExtra = FamilyScenarios.domainBaseWithExtra();

  const familyWithoutExtra = FamilyScenarios.domainBase();

  const mongoDocumentWithExtra: MongoFamilyDocument =
    FamilyScenarios.mongoBaseWithExtra();
  const mongoDocumentWithoutExtra: MongoFamilyDocument =
    FamilyScenarios.mongoBase();

  describe('fromMongoDocument', () => {
    it('should convert Mongo document with extra to Family domain entity', () => {
      const result = familyPersistenceMapper.fromMongoDocument(
        mongoDocumentWithExtra
      );

      expect(result).toBeInstanceOf(Family);

      expect(result.idValue).toBe(fromMongoId(mongoDocumentWithExtra._id));

      expect(result.slug).toBe(mongoDocumentWithExtra.slug);
      expect(result.name).toBe(mongoDocumentWithExtra.name);
      expect(result.aliases).toEqual(mongoDocumentWithExtra.aliases);
      expect(result.scientificName).toBe(mongoDocumentWithExtra.scientificName);
      expect(result.shortDescription).toBe(
        mongoDocumentWithExtra.shortDescription
      );
      expect(result.highlights).toEqual(mongoDocumentWithExtra.highlights);

      expect(result.extra).toEqual(mongoDocumentWithExtra.extra);
      expect(result.metadata.createdBy).toBe(
        mongoDocumentWithExtra.metadata.createdBy
      );
    });

    it('should convert Mongo document without extra to Family domain entity', () => {
      const result = familyPersistenceMapper.fromMongoDocument(
        mongoDocumentWithoutExtra
      );

      expect(result.extra).toBeUndefined();
    });
  });

  describe('toMongoDocument', () => {
    it('should convert Family domain with extra entity to Mongo document', () => {
      const result = familyPersistenceMapper.toMongoDocument(familyWithExtra);

      expect(result).toEqual({
        _id: toMongoId(familyWithExtra.idValue),
        slug: familyWithExtra.slug,
        name: familyWithExtra.name,
        aliases: familyWithExtra.aliases,
        scientificName: familyWithExtra.scientificName,
        shortDescription: familyWithExtra.shortDescription,
        highlights: familyWithExtra.highlights,
        extra: familyWithExtra.extra,
        metadata: familyWithExtra.metadata.toPrimitives()
      });
    });

    it('should convert Family domain without extra entity to Mongo document', () => {
      const result =
        familyPersistenceMapper.toMongoDocument(familyWithoutExtra);

      expect(result).toEqual({
        _id: toMongoId(familyWithoutExtra.idValue),
        slug: familyWithoutExtra.slug,
        name: familyWithoutExtra.name,
        aliases: familyWithoutExtra.aliases,
        scientificName: familyWithoutExtra.scientificName,
        shortDescription: familyWithoutExtra.shortDescription,
        highlights: familyWithoutExtra.highlights,
        metadata: familyWithoutExtra.metadata.toPrimitives()
      });
    });
  });
});
