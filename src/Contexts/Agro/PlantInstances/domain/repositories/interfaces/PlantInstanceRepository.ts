import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { PaginationParams } from '../../../../../../shared/domain/query/interfaces/PaginationParams.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { PlantInstance } from '../../entities/PlantInstance.js';
import type { PlantInstancePrimitives } from '../../entities/types/PlantInstancePrimitives.js';

export type ListPlantInstancesParams = {
  userId: string;
  bedId?: string | undefined;
  plantId?: string | undefined;
  sort?:
    | {
        field: 'plantedAt';
        order: 'asc' | 'desc';
      }
    | undefined;
  pagination: PaginationParams;
};

/** The id of a crop and the bed it grows in, without loading the crop. */
export type PlantInstanceRef = {
  id: string;
  bedId: string;
};

export interface PlantInstanceRepository {
  /** Inserts a new crop; an id already in use fails with a conflict. */
  save(instance: PlantInstance): Promise<void>;
  updateWithDiff(
    current: PlantInstancePrimitives,
    updated: PlantInstancePrimitives
  ): Promise<WriteOutcome>;
  findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<PlantInstance>>;
  listOwnedActive(
    params: ListPlantInstancesParams
  ): Promise<PaginatedResult<PlantInstance>>;
  /** Active crops of the beds, oldest planted first. */
  findActiveByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstance[]>;
  /** Same order as `findActiveByBedIds`, reading only ids. */
  findActiveRefsByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstanceRef[]>;
  findActiveByBedId(bedId: string, userId: string): Promise<PlantInstance[]>;
  markAllInBedAsRemoved(
    bedId: string,
    userId: string,
    removedAt: Date,
    updatedBy: string
  ): Promise<number>;
}
