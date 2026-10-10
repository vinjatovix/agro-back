import type { CollationOptions, Db } from 'mongodb';
import type { ReadOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import {
  MongoReadRepository,
  type ProjectionExpression,
  type ReadProjection
} from '../../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  PlantField,
  PlantReadRepository,
  PlantReadView,
  PlantSparseView
} from '../../../application/queries/index.js';
import type { PlantFilter } from '../../../domain/entities/types/PlantFilter.js';
import type { PlantQueryMapper } from './mappers/PlantQueryMapper.js';
import {
  toPlantReadView,
  toPlantSparseView,
  type StoredPlantDocument
} from './plantReadViewMapper.js';
import { toPlantSortField } from './plantSortFields.js';

export type MongoPlantReadRepositoryDependencies = {
  db: Db;
  plantQueryMapper: PlantQueryMapper;
};

// The primary image: the first `knowledge.resources` entry whose `type` is
// exactly `image`, in stored order (`PlantKnowledge.primaryImage()` on the
// write side). Computed here, so a read of `image` without `knowledge` never
// fetches the rest of `knowledge`. `$elemMatch` cannot be used: MongoDB
// rejects it on a nested field. The type is matched with a regex, not `$eq`:
// the listing runs with the case-insensitive plant collation, under which
// `$eq` would also take `Image`; a regex ignores the collation.
const PRIMARY_IMAGE: ProjectionExpression = {
  $first: {
    $filter: {
      input: '$knowledge.resources',
      as: 'resource',
      cond: {
        $and: [
          { $eq: [{ $type: '$$resource.type' }, 'string'] },
          { $regexMatch: { input: '$$resource.type', regex: '^image$' } }
        ]
      },
      limit: 1
    }
  }
};

// Contract fields only: unknown stored fields never leave the database.
const PLANT_PROJECTION: ReadProjection = {
  identity: 1,
  traits: 1,
  phenology: 1,
  knowledge: 1,
  image: PRIMARY_IMAGE,
  metadata: 1,
  status: 1,
  deletedAt: 1,
  version: 1
};

// Same value as `PlantStatus.DELETED`; a type-only import keeps the read side
// free of domain values.
const DELETED_STATUS: PlantReadView['status'] = 'DELETED';

export class MongoPlantReadRepository
  extends MongoReadRepository<
    StoredPlantDocument,
    PlantFilter,
    PlantSparseView,
    PlantField
  >
  implements PlantReadRepository
{
  private readonly plantQueryMapper: PlantQueryMapper;

  constructor({ db, plantQueryMapper }: MongoPlantReadRepositoryDependencies) {
    super(db);
    this.plantQueryMapper = plantQueryMapper;
  }

  protected collectionName(): string {
    return 'plants';
  }

  protected projection(): ReadProjection {
    return PLANT_PROJECTION;
  }

  protected toView(
    document: StoredPlantDocument,
    fields?: readonly PlantField[]
  ): PlantSparseView {
    return fields === undefined
      ? toPlantReadView(document)
      : toPlantSparseView(document, fields);
  }

  /** Soft-deleted plants are hidden from non-privileged readers. */
  private activeFilter(): UnknownRecord {
    return { status: { $ne: DELETED_STATUS } };
  }

  protected getCollation(): CollationOptions {
    return { locale: 'es', strength: 2 };
  }

  protected toMongoSortField(key: string): string {
    return toPlantSortField(key);
  }

  protected toMongoFilter(filter?: PlantFilter): Record<string, unknown> {
    return filter ? this.plantQueryMapper.toMongo(filter) : {};
  }

  async findActiveById(
    id: string,
    options: ReadOptions<PlantField> = {}
  ): Promise<Nullable<PlantSparseView>> {
    return this.findOneView(
      { _id: toMongoId(id), ...this.activeFilter() },
      options
    );
  }
}
