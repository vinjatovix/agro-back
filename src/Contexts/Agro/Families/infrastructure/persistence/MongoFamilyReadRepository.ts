import type { Db } from 'mongodb';
import { validate as validateUuid } from 'uuid';
import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoReadRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  FamilyField,
  FamilyReadRepository,
  FamilySparseView,
  FamilySummary
} from '../../application/queries/index.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import {
  toFamilyReadView,
  toFamilySparseView,
  type StoredFamilyDocument
} from './familyReadViewMapper.js';

export type MongoFamilyReadRepositoryDependencies = {
  db: Db;
};

// Contract fields only: unknown stored fields never leave the database.
const FAMILY_PROJECTION = {
  slug: 1,
  name: 1,
  aliases: 1,
  scientificName: 1,
  shortDescription: 1,
  highlights: 1,
  extra: 1,
  metadata: 1,
  version: 1
} as const;

const SUMMARY_PROJECTION = { name: 1, slug: 1 } as const;

type StoredFamilySummary = Pick<StoredFamilyDocument, '_id' | 'name' | 'slug'>;

export class MongoFamilyReadRepository
  extends MongoReadRepository<
    StoredFamilyDocument,
    FamilyFilter,
    FamilySparseView,
    FamilyField
  >
  implements FamilyReadRepository
{
  constructor({ db }: MongoFamilyReadRepositoryDependencies) {
    super(db);
  }

  protected collectionName(): string {
    return 'families';
  }

  protected projection(): Readonly<Record<string, 1>> {
    return FAMILY_PROJECTION;
  }

  protected toView(
    document: StoredFamilyDocument,
    fields?: readonly FamilyField[]
  ): FamilySparseView {
    return fields === undefined
      ? toFamilyReadView(document)
      : toFamilySparseView(document, fields);
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<Nullable<FamilySparseView>> {
    return this.findOneView({ slug }, options);
  }

  async findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly FamilySummary[]> {
    // Family ids are UUIDs; anything else cannot match a stored family.
    const mongoIds = [...new Set(ids)].filter(validateUuid).map(toMongoId);
    if (mongoIds.length === 0) return [];

    const filter: UnknownRecord = { _id: { $in: mongoIds } };
    const documents = await this.collection()
      .find<StoredFamilySummary>(filter, { projection: SUMMARY_PROJECTION })
      .toArray();

    return documents.map((document) => ({
      id: fromMongoId(document._id),
      name: document.name,
      slug: document.slug
    }));
  }
}
