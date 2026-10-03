import type { CollationOptions, Db } from 'mongodb';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoReadRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  PlantReadRepository,
  PlantReadView
} from '../../../application/queries/index.js';
import type { PlantFilter } from '../../../domain/entities/types/PlantFilter.js';
import type { PlantQueryMapper } from './mappers/PlantQueryMapper.js';
import {
  toPlantReadView,
  type StoredPlantDocument
} from './plantReadViewMapper.js';
import { toPlantSortField } from './plantSortFields.js';

export type MongoPlantReadRepositoryDependencies = {
  db: Db;
  plantQueryMapper: PlantQueryMapper;
};

// Contract fields only: unknown stored fields never leave the database.
const PLANT_PROJECTION = {
  identity: 1,
  traits: 1,
  phenology: 1,
  knowledge: 1,
  metadata: 1,
  status: 1,
  deletedAt: 1,
  version: 1
} as const;

// Same value as `PlantStatus.DELETED`; a type-only import keeps the read side
// free of domain values.
const DELETED_STATUS: PlantReadView['status'] = 'DELETED';

export class MongoPlantReadRepository
  extends MongoReadRepository<StoredPlantDocument, PlantFilter, PlantReadView>
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

  protected projection(): Readonly<Record<string, 1>> {
    return PLANT_PROJECTION;
  }

  protected toView(document: StoredPlantDocument): PlantReadView {
    return toPlantReadView(document);
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

  async findActiveById(id: string): Promise<Nullable<PlantReadView>> {
    return this.findOneView({ _id: toMongoId(id), ...this.activeFilter() });
  }
}
