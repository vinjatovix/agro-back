import type { Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import { MongoReadRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  FamilyReadRepository,
  FamilyReadView
} from '../../application/queries/index.js';
import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import {
  toFamilyReadView,
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

export class MongoFamilyReadRepository
  extends MongoReadRepository<
    StoredFamilyDocument,
    FamilyFilter,
    FamilyReadView
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

  protected toView(document: StoredFamilyDocument): FamilyReadView {
    return toFamilyReadView(document);
  }

  async findBySlug(slug: string): Promise<Nullable<FamilyReadView>> {
    return this.findOneView({ slug });
  }
}
